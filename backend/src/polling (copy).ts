import type {
  Hex,
  Block,
  Hash,
  Transaction,
  Address,
  Log,
  AbiEvent,
} from "viem";
import { parseAbi, parseEventLogs, pad, formatLog, numberToHex } from "viem";
import { config, eventEmitter } from "./config.ts";
import { ABI_REGISTRY } from "./utils/helpers.ts";
import {
  addToBlocks,
  addToEvents,
  getLastBlock,
  watchedAddressList,
} from "./repositories.ts";

type EventType = AbiEvent | null;
type ContractType = Address | null;

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

//////////////////// EVENTS ////////////////////////////////
const getEventLogs = async (
  fromBlock: bigint,
  toBlock: bigint,
  watchedAddresses: Hex[], // already padded to 32 bytes
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

const isNativeEthTransfer = async (tx: Transaction): Promise<boolean> => {
  if (tx.to === null || tx.input !== "0x") {
    return false;
  }
  const toCode = await config.publicClient.getCode({ address: tx.to });
  const isPureEoaTransfer = !toCode || toCode === "0x";
  return isPureEoaTransfer && tx.value > 0n;
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
    if (last_indexed_block < currentBLockNum) {
      const fromBLock = last_indexed_block + 1n;
      const watchedAddressObjects = await watchedAddressList();
      if (watchedAddressObjects.count === 0) {
        console.log("No wallet to check");
        return false;
      }
      const watchedAddresses = watchedAddressObjects.res
        .filter((obj) => obj.active === true)
        .map((obj) => pad(obj.address, { size: 32 }));

      let blocks = [];
      let nativeTxs = [];
      for (let i = fromBLock; i <= currentBLockNum; i++) {
        const block = await getBLockData(i);
        block.transactions.forEach(async (transaction, index) => {
          const tx = await getTransactionDetails(transaction);
          const isNative = await isNativeEthTransfer(tx);
          if (isNative) {
            const nativeTx = prepareTransaction(tx);
            nativeTxs.push(nativeTx);
          }
        });
        blocks.push(prepareBlock(block));
      }
      const responseSaveBlock = await addToBlocks(blocks);
      if (responseSaveBlock.status !== 200) {
        console.log(responseSaveBlock.msg);
        return;
      }
      const eventLogs = await getEventLogs(
        fromBLock,
        currentBLockNum,
        watchedAddresses,
      );
      let parsedEvents = [];
      if (eventLogs.length > 0) {
        const parsedLogs = parseLogs(eventLogs);
        parsedEvents = prepareEvents(parsedLogs);
      }
      const allEvents = [...nativeTxs, ...parsedEvents];

      const responseSaveEvents = await addToEvents(allEvents);
      if (responseSaveEvents.status !== 200) {
        console.log(responseSaveEvents.msg);
        return;
      }
      pushEvents(responseSaveEvents.addedRows);

      last_indexed_block = currentBLockNum;
    }
    console.log("last indexed 2: ", last_indexed_block);
  } catch (err) {
    console.error(err);
  } finally {
    setTimeout(poller, config.poll_interval_ms);
  }
};
