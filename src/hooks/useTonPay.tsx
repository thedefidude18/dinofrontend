import { useTonClient } from "./useTonClient";
import {
  Address,
  beginCell,
  storeMessage,
  TonClient,
  Transaction,
  Cell,
  toNano,
} from "@ton/ton";
import { useState } from "react";
import { useTonConnect } from "./useTonConnect";
import { CHAIN } from "@tonconnect/ui-react";
import { $http } from "@/lib/http";
import { sleep } from "@/lib/utils";

interface WaitForTransactionOptions {
  address: string;
  hash: string;
  refetchInterval?: number;
  refetchLimit?: number;
}

const waitForTransaction = async (
  options: WaitForTransactionOptions,
  client: TonClient
): Promise<Transaction | null> => {
  const { hash, refetchInterval = 2000, refetchLimit, address } = options;

  return new Promise((resolve) => {
    let refetches = 0;
    const walletAddress = Address.parse(address);
    const interval = setInterval(async () => {
      refetches += 1;

      console.log("waiting transaction...");
      const state = await client.getContractState(walletAddress);
      if (!state || !state.lastTransaction) {
        clearInterval(interval);
        resolve(null);
        return;
      }
      const lastLt = state.lastTransaction.lt;
      const lastHash = state.lastTransaction.hash;
      const lastTx = await client.getTransaction(
        walletAddress,
        lastLt,
        lastHash
      );

      if (lastTx && lastTx.inMessage) {
        const msgCell = beginCell()
          .store(storeMessage(lastTx.inMessage))
          .endCell();

        const inMsgHash = msgCell.hash().toString("base64");
        console.log("InMsgHash", inMsgHash);
        if (inMsgHash === hash) {
          clearInterval(interval);
          resolve(lastTx);
        }
      }
      if (refetchLimit && refetches >= refetchLimit) {
        clearInterval(interval);
        resolve(null);
      }
    }, refetchInterval);
  });
};

type UseTonPayProps = {
  onRequestSent?: () => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

const useTonPay = ({
  onSuccess,
  onError,
  onRequestSent,
}: UseTonPayProps = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { tonConnectUI, address } = useTonConnect();
  const tonClient = useTonClient();

  const send = async (amount: number, msg?: string) => {
    const sendTo = "UQDHewiowVSe-UUT7T_WTlELpKRqxmFNMZJClYBSk5Lin-BD";
    try {
      const { boc } = await tonConnectUI.sendTransaction({
        messages: [
          {
            address: sendTo,
            amount: toNano(amount).toString(),
            payload: msg
              ? beginCell()
                  .storeUint(0, 32)
                  .storeStringTail(msg)
                  .endCell()
                  .toBoc()
                  .toString("base64")
              : undefined,
          },
        ],
        network: CHAIN.MAINNET,
        validUntil: Date.now() + 5 * 60 * 1000, // 5 minutes for user to approve
        from: address,
      });

      setIsLoading(true);

      onRequestSent?.();

      const hash = Cell.fromBase64(boc).hash().toString("base64");

      if (tonClient) {
        const txFinalized = await waitForTransaction(
          {
            address: tonConnectUI.account?.address ?? "",
            hash,
          },
          tonClient
        );
        console.log("txFinalized", txFinalized);
        onSuccess?.();
      }
      const source = Address.parse(address).toRawString();
      const destination = Address.parse(sendTo).toRawString();

      await sleep(2000);
      await $http.post("/test", {
        hash,
        source,
        destination,
        amountInNano: toNano(amount).toString(),
        amount: amount,
      });
    } catch (error: unknown) {
      onError?.(error);
    }
    setIsLoading(false);
  };

  return {
    send,
    isLoading,
  };
};

export default useTonPay;
