import type { Hex, Block, Hash, Transaction, Address, Log } from "viem";
import {
  parseAbi,
  parseEventLogs,
  pad,
  formatLog,
  numberToHex,
  getAddress,
} from "viem";
import { config, eventEmitter } from "./config.ts";
import { ABI_REGISTRY } from "./utils/helpers.ts";
import {
  getLastBlock,
  watchedAddressListPoller,
  saveBlocksAndEvents,
  getRecentBlocks,
  rollbackAbove,
} from "./repositories.ts";

const MAX_REORG_DEPTH = 64;
const CHUNK_SIZE = config.chunkSize;
////////////////////  BLOCKS ///////////////////////////////
const getLastIndexedBlock = async (): Promise<bigint> => {
  const lastBlockStored = await getLastBlock();
  const last_indexed_block =
    lastBlockStored.length > 0 ? lastBlockStored[0].number : config.fresh_state;
  return last_indexed_block;
};
let last_indexed_block = await getLastIndexedBlock();

const getBLockData = async (blockNum: bigint): Promise<Block> => {
  const blockDetails = await config.publicClient.getBlock({
    blockNumber: blockNum,
    includeTransactions: true,
  });
  return blockDetails;
};

const getCurrentBlockNum = async (): Promise<bigint> => {
  const blockNumber: bigint = await config.publicClient.getBlockNumber();
  return blockNumber;
};

const prepareBlock = (block: Block) => {
  const row = {
    number: block.number,
    hash: block.hash,
    parent_hash: block.parentHash,
  };
  return row;
};

//////////////////  BLOCKS /////////////////////////////////

const detectReorg = async (): Promise<boolean> => {
  const stored = await getLastBlock();
  if (stored.length === 0) return false;
  const { number, hash: storedHash } = stored[0];
  let chainBlock: Block;
  try {
    chainBlock = await config.publicClient.getBlock({ blockNumber: number });
  } catch (err) {
    if ((err as Error)?.name === "BlockNotFoundError") {
      console.log(
        `REORG DETECTED: node has no block ${number} (we stored hash ${storedHash})`,
      );
      return true;
    }
    throw err; // any other failure (network, rate limit) aborts the poll
  }

  if (chainBlock.hash !== storedHash) {
    console.log(
      `REORG DETECTED at block ${number}: stored ${storedHash}, chain ${chainBlock.hash}`,
    );
    return true;
  }
  return false;
};

const findCommonAncestor = async (): Promise<bigint> => {
  const stored = await getRecentBlocks(MAX_REORG_DEPTH);
  for (const row of stored) {
    let chainHash: Hash | null = null;
    try {
      const chainBlock = await config.publicClient.getBlock({
        blockNumber: row.number,
      });
      chainHash = chainBlock.hash;
    } catch (err) {
      if ((err as Error)?.name !== "BlockNotFoundError") throw err;
    }
    if (chainHash === row.hash) return row.number;
  }

  throw new Error(
    `No common ancestor within ${MAX_REORG_DEPTH} blocks: refusing to guess`,
  );
};

const indexRange = async (
  fromBLock: bigint,
  toBlock: bigint,
  watchedAddresses,
) => {
  let blocks = [];
  let txs = [];
  for (let i = fromBLock; i <= toBlock; i++) {
    const block = await getBLockData(i);
    txs = [...txs, ...block.transactions];
    blocks.push(prepareBlock(block));
  }
  await checkContinuity(blocks, fromBLock); //For reorg check in between chunks
  const isNativeTx = checkNativeEthTransfer(watchedAddresses);
  const minedNativeTxs = txs.filter(isNativeTx);
  let finalNativeTxs = [];
  for (const tx of minedNativeTxs) {
    const status = await checkNativeEthTransferReceipt(tx);
    console.log("status: ", status);
    if (status) {
      finalNativeTxs.push(tx);
    }
  }
  const nativeTxs = finalNativeTxs.map(prepareTransaction);
  const paddedWatchedatchedAddresses = watchedAddresses.map((address) =>
    pad(address, { size: 32 }),
  );
  const eventLogs = await getEventLogs(
    fromBLock,
    toBlock,
    paddedWatchedatchedAddresses,
  );
  ///////////////// For reorg check in between chunks //////////
  const tip = await config.publicClient.getBlock({ blockNumber: toBlock });
  if (tip.hash !== blocks[blocks.length - 1].hash) {
    throw new Error(
      `Chain changed while fetching logs for ${fromBLock}..${toBlock}`,
    );
  }
  ///////////////// For reorg check in between chunks //////////

  let parsedEvents = [];
  if (eventLogs.length > 0) {
    const parsedLogs = parseLogs(eventLogs);
    parsedEvents = prepareEvents(parsedLogs);
  }
  const allEvents = [...nativeTxs, ...parsedEvents];
  const responseSave = await saveBlocksAndEvents(blocks, allEvents);
  if (responseSave.status !== 200) {
    throw new Error("saving chunk failed", { cause: responseSave.msg });
  }
  pushEvents(responseSave.addedRows);
  last_indexed_block = toBlock;
};

const checkContinuity = async (
  fetched: { number: bigint; hash: string; parent_hash: string }[],
  from: bigint,
) => {
  const stored = await getLastBlock();
  // Link to the stored chain only if the stored tip is the block right before this chunk
  let expectedParent: string | null =
    stored.length > 0 && stored[0].number === from - 1n ? stored[0].hash : null;

  for (const b of fetched) {
    if (expectedParent !== null && b.parent_hash !== expectedParent) {
      throw new Error(
        `Chain discontinuity at block ${b.number}: parent ${b.parent_hash}, expected ${expectedParent}`,
      );
    }
    expectedParent = b.hash;
  }
};
//////////////////// EVENTS ////////////////////////////////
const getEventLogs = async (
  fromBlock: bigint,
  toBlock: bigint,
  watchedAddresses: Hex[],
): Promise<Log[]> => {
  const range = {
    fromBlock: numberToHex(fromBlock),
    toBlock: numberToHex(toBlock),
  };
  const topicFilters = [
    [null, watchedAddresses],
    [null, null, watchedAddresses],
    [null, null, null, watchedAddresses],
  ];
  const responses = await Promise.all(
    topicFilters.map((topics) =>
      config.publicClient.request({
        method: "eth_getLogs",
        params: [{ ...range, topics }],
      } as any),
    ),
  );
  const unique = new Map<string, Log>();
  for (const rawLogs of responses as any[][]) {
    for (const raw of rawLogs) {
      const log = formatLog(raw);
      unique.set(`${log.transactionHash}:${log.logIndex}`, log);
    }
  }
  return [...unique.values()];
};

const parseLogs = (eventLogs: Log[]): Log[] => {
  const parsedLogs = parseEventLogs({
    abi: parseAbi(ABI_REGISTRY),
    logs: eventLogs,
  });
  return parsedLogs;
};

const prepareEvents = (parsedLogs: Log[]) => {
  const rows = parsedLogs.map((log) => ({
    blockNumber: log.blockNumber,
    txHash: log.transactionHash,
    logIndex: log.logIndex,
    contract: log.address,
    eventName: log.eventName,
    args: serializeBigInts(log.args),
  }));
  return rows;
};

///////////////////// EVENTS ///////////////////////////////

////////////////////// TRANSACTIONS ///////////////////////
const getTransactionDetails = async (txHash: Hash): Promise<Transaction> => {
  const txDetails = await config.publicClient.getTransaction({ hash: txHash });
  return txDetails;
};

const checkNativeEthTransfer = (wallets: Address[]) => {
  return (tx) => {
    if (tx.from === null || tx.to === null) return false;
    const from = getAddress(tx.from);
    const to = getAddress(tx.to);
    return (
      (wallets.includes(from) || wallets.includes(to)) &&
      tx.input === "0x" &&
      tx.value > 0n
    );
  };
};

const checkNativeEthTransferReceipt = async (tx: Transaction) => {
  const receipt = await config.publicClient.getTransactionReceipt({
    hash: tx.hash,
  });
  return receipt.status == "success";
};

const prepareTransaction = (tx: Transaction) => {
  const args = {
    from: tx.from,
    to: tx.to,
    value: tx.value,
  };
  const row = {
    blockNumber: tx.blockNumber,
    txHash: tx.hash,
    logIndex: 0,
    contract: "0x0",
    eventName: "Eth transfer",
    args: serializeBigInts(args),
  };
  return row;
};

////////////////////// TRANSACTIONS //////////////////////

const serializeBigInts = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );

const pushEvents = (events: object[]) => {
  if (events.length === 0) return;
  const eventData = events.map((event) => ({
    blockNumber: event.blockNumber.toString(),
    txHash: event.txHash,
    contract: event.contract,
    eventName: event.eventName,
    args: JSON.stringify(event.args),
    indexedAt: event.indexedAt,
  }));
  eventEmitter.emit("publish-events", eventData);
};

export const poller = async () => {
  try {
    const currentBLockNum = await getCurrentBlockNum();
    const reorged = await detectReorg();
    if (reorged) {
      const ancestor = await findCommonAncestor();
      await rollbackAbove(ancestor);
      last_indexed_block = ancestor;
      console.log(`rolled back to common ancestor ${ancestor}`);
    }
    console.log("last indexed block: ", last_indexed_block);
    console.log("current block: ", currentBLockNum);
    if (last_indexed_block < currentBLockNum) {
      const watchedAddresses = (await watchedAddressListPoller()).map(
        (obj) => obj.address,
      );
      console.log("watched addresses: ", watchedAddresses);

      if (watchedAddresses.length === 0) {
        console.log("No wallet to check");
        return false;
      }

      while (last_indexed_block < currentBLockNum) {
        const fromBLock = last_indexed_block + 1n;
        const chunkEnd = fromBLock + CHUNK_SIZE - 1n;
        const toBlock = chunkEnd < currentBLockNum ? chunkEnd : currentBLockNum;
        await indexRange(fromBLock, toBlock, watchedAddresses);
        console.log(`indexed chunk ${fromBLock}..${toBlock}`);
      }
    }
    console.log("last indexed 2: ", last_indexed_block);
  } catch (err) {
    console.error(err);
  } finally {
    setTimeout(poller, config.poll_interval_ms);
  }
};
