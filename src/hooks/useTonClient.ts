import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "@ton/ton";
import { useAsyncInitialize } from "./useAsyncInitialize";
import { CHAIN } from "@tonconnect/ui-react";
import { useTonConnect } from "./useTonConnect";

export function useTonClient() {
  const { network } = useTonConnect();
  return useAsyncInitialize(
    async () =>
      new TonClient({
        endpoint: await getHttpEndpoint({
          network: network === CHAIN.MAINNET ? "mainnet" : "testnet",
        }),
      }),
    [network]
  );
}
