// src/components/MetaMaskPay.tsx
"use client";

import { useMemo, useState } from "react";
import {
  encodeFunctionData,
  decodeFunctionData,
  parseUnits,
  Address,
} from "viem";

/* Let TS know about the injected MetaMask provider */
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

type Plan = "personal" | "family" | "business";

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function short(addr?: string, n = 4) {
  return addr ? `${addr.slice(0, 2 + n)}…${addr.slice(-n)}` : "";
}

function explorerBase(chainId: number) {
  if (chainId === 1) return "https://etherscan.io";
  if (chainId === 8453) return "https://basescan.org";
  if (chainId === 84532) return "https://sepolia.basescan.org";
  return "";
}

export default function MetaMaskPay({
  plan,
  usd,
}: {
  plan: Plan;
  usd: number; // e.g., 20, 50, 500
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  const chainIdNum = Number(process.env.NEXT_PUBLIC_CRYPTO_CHAIN_ID || "8453"); // Base mainnet default
  const chainName =
    chainIdNum === 1
      ? "Ethereum Mainnet"
      : chainIdNum === 8453
      ? "Base Mainnet"
      : `Chain ${chainIdNum}`;
  const chainIdHex = "0x" + chainIdNum.toString(16);

  const usdc = (process.env.NEXT_PUBLIC_USDC_CONTRACT || "").trim() as Address;
  const merchant = (process.env.NEXT_PUBLIC_MERCHANT_WALLET || "").trim() as Address;

  const encoded = useMemo(() => {
    try {
      const amount = parseUnits(String(usd), 6); // USDC = 6 decimals
      return encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [merchant, amount],
      });
    } catch {
      return "0x";
    }
  }, [merchant, usd]);

  // For display confidence: decode back to show the true recipient
  const decodedTo: string | null = useMemo(() => {
    try {
      const d = decodeFunctionData({ abi: ERC20_TRANSFER_ABI, data: encoded as Address });
      return (d.args?.[0] as string) || null;
    } catch {
      return null;
    }
  }, [encoded]);

  async function payWithMetaMask() {
    try {
      setBusy(true);
      setMsg(null);
      setTx(null);

      if (typeof window === "undefined" || !window.ethereum)
        throw new Error("MetaMask not found in this browser");

      if (!usdc || !merchant) throw new Error("Missing USDC contract or merchant wallet in env");

      // Connect wallet
      const [from] = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      // Switch network if needed
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdHex }],
        });
      } catch (err: any) {
        if (err?.code === 4902) throw new Error("Add the target network to MetaMask, then retry.");
        throw err;
      }

      // Send ERC-20 transfer (to = USDC contract; merchant encoded in data)
      const txHash = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: usdc,
            data: encoded,
            // value is omitted (0), you only pay gas in the chain’s native token
          },
        ],
      })) as string;

      setTx(txHash);
      setMsg(
        `Payment submitted. You’ll be upgraded after confirmation.`
      );
    } catch (e: any) {
      setMsg(e?.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  const exp = explorerBase(chainIdNum);

  return (
    <div className="mt-3">
      {/* Preflight clarity */}
      <div className="rounded-lg border border-zinc-800 p-3 text-[12px] text-zinc-400">
        <div>
          Network: <span className="text-zinc-200">{chainName}</span>
        </div>
        <div>
          Token: <span className="text-zinc-200">USDC</span>{" "}
          <span className="ml-1">({short(usdc)})</span>
        </div>
        <div>
          Will send: <span className="text-zinc-200">{usd} USDC</span>
        </div>
        <div>
          Recipient:{" "}
          <span className="text-zinc-200">{short(decodedTo || merchant)}</span>
        </div>
        <div className="mt-1 italic">
          MetaMask will show <b>To: USD&nbsp;Coin</b> — that’s normal for ERC-20.
        </div>
      </div>

      <button
        onClick={payWithMetaMask}
        disabled={busy}
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium hover:border-zinc-500 hover:bg-zinc-900 disabled:opacity-60"
      >
        {busy ? "Waiting for MetaMask…" : `Pay ${usd} USDC with MetaMask`}
      </button>

      {msg && <p className="mt-2 text-xs text-zinc-300">{msg}</p>}
      {tx && exp && (
        <a
          className="mt-1 block text-xs underline text-zinc-400 hover:text-zinc-200"
          href={`${exp}/tx/${tx}`}
          target="_blank"
          rel="noreferrer"
        >
          View on explorer
        </a>
      )}

      <p className="mt-2 text-[11px] text-zinc-500">
        Crypto payments are final. For refunds, email{" "}
        {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@knowrah.com"}.
      </p>
    </div>
  );
}
