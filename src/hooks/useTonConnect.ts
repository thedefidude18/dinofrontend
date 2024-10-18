import {
  CHAIN,
  useTonAddress,
  useTonConnectUI,
  useTonWallet,
} from "@tonconnect/ui-react";
import { Address } from "@ton/core";
import { TonConnectUI } from "@tonconnect/ui";

export const useTonConnect = (): {
  connected: boolean;
  address: string;
  walletAddress: Address | null;
  network: CHAIN | null;
  tonConnectUI: TonConnectUI;
} => {
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress();

  const wallet = useTonWallet();
  const walletAddress = wallet?.account?.address
    ? Address.parse(wallet.account.address)
    : undefined;

  return {
    connected: !!wallet?.account?.address,
    walletAddress: walletAddress ?? null,
    network: wallet?.account?.chain ?? null,
    address,
    tonConnectUI,
  };
};
