// src/components/MetaMaskPay.tsx
"use client";

import { useState } from "react";
import { encodeFunctionData, parseUnits } from "viem";

/* Make TS aware of the injected MetaMask provider */
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

export default function MetaMaskPay({
  plan,
  usd,
}: {
  plan: Plan;
  usd: number; // e.g., 20, 50, 500
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const chainIdNum = Number(process.env.NEXT_PUBLIC_CRYPTO_CHAIN_ID || "8453"); // Base mainnet default
  const chainIdHex = "0x" + chainIdNum.toString(16);
  const usdc = (process.env.NEXT_PUBLIC_USDC_CONTRACT || "").trim();
  const merchant = (process.env.NEXT_PUBLIC_MERCHANT_WALLET || "").trim();

  async function payWithMetaMask() {
    try {
      setBusy(true);
      setMsg(null);

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

      // Amount in USDC (6 decimals)
      const amount = parseUnits(String(usd), 6);

      // Encode ERC20: transfer(to, amount)
      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [merchant as `0x${string}`, amount],
      });

      // Send the transaction through MetaMask
      const txHash = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: usdc, // USDC contract address
            data, // transfer(to, amount)
          },
        ],
      })) as string;

      setMsg(
        `Payment submitted. Tx: ${txHash.slice(0, 10)}…  You’ll be upgraded after confirmation.`
      );

      // Optional server record (non-blocking)
      fetch("/api/crypto/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, txHash }),
      }).catch(() => {});
    } catch (e: any) {
      setMsg(e?.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={payWithMetaMask}
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium hover:border-zinc-500 hover:bg-zinc-900 disabled:opacity-60"
      >
        {busy ? "Waiting for MetaMask…" : `Pay ${usd} USDC with MetaMask`}
      </button>
      {msg && <p className="mt-2 text-xs text-zinc-400">{msg}</p>}
      <p className="mt-2 text-[11px] text-zinc-500">
        Crypto payments are final. For refunds, email{" "}
        {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@knowrah.com"}.
      </p>
    </div>
  );
}
