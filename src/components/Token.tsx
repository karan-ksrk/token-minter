import { useState, useEffect, useMemo } from 'react'
import * as anchor from "@project-serum/anchor";
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, BN, AnchorProvider } from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '../App.css'


import {
    TOKEN_PROGRAM_ID,
    MINT_SIZE,
    createAssociatedTokenAccountInstruction,
    getOrCreateAssociatedTokenAccount,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    AccountLayout,
} from "@solana/spl-token";

import idl from '../idl.json'
import { fetchData } from '@project-serum/anchor/dist/cjs/utils/registry';

const CreateToken = () => {
    const [myWallet, setMyWallet] = useState<any>();
    const [tokenAddress, setTokenAddress] = useState<string>();
    const [ataAddress, setAtaAddress] = useState<PublicKey>();
    const [tokenAccounts, setTokenAccounts] = useState<any>([]);
    const [ataAccounts, setAtaAccounts] = useState<any>([]);
    const mintKey = useMemo(() => anchor.web3.Keypair.generate(), []);
    // const mintKey: PublicKey = new anchor.web3.PublicKey("C3RaB4g1uSiyA9UdGTMkVGMAGJdVRLQCxWXP3MTmgNcx");
    const wallet = useAnchorWallet();
    const [mintcount, setMintcount] = useState<number>(0);


    useEffect(() => {
        fetchAtaAccounts(tokenAccounts);
    }, [tokenAccounts]);

    useEffect(() => {
    }, [ataAccounts]);

    useEffect(() => {
        if (wallet) {
            setMyWallet(wallet.publicKey.toString());
        }
        getProvider();
        getTokenAccount();

    }, [wallet]);

    async function getProvider() {
        if (!wallet) {
            return null;
        }
        const network = "https://api.devnet.solana.com";
        const connection = new Connection(network, "processed");

        const provider = new AnchorProvider(
            connection, wallet, { "preflightCommitment": "processed" },
        )
        return provider
    }

    async function createToken() {
        if (!wallet) {
            return null;
        }
        const provider = await getProvider();
        if (!provider) {
            return null;
        }

        const a = JSON.stringify(idl);
        const b = JSON.parse(a);

        const program = new Program(b, idl.metadata.address, provider);
        const lamports: number = await program.provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

        const mint_tx = new anchor.web3.Transaction().add(
            anchor.web3.SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                newAccountPubkey: mintKey.publicKey,
                space: MINT_SIZE,
                programId: TOKEN_PROGRAM_ID,
                lamports,
            }),
            createInitializeMintInstruction(
                mintKey.publicKey, 0, wallet.publicKey, wallet.publicKey
            ),
        )
        const res = await provider?.sendAndConfirm(mint_tx, [mintKey]);

        if (res) {
            setTokenAddress(mintKey.publicKey.toString());
        }



    }


    async function MintToken(mintAmount: number) {
        if (!wallet) {
            return null;
        }
        const provider = await getProvider();
        if (!provider) {
            return null;
        }
        if (!ataAddress) {
            return null;
        }

        const a = JSON.stringify(idl);
        const b = JSON.parse(a);
        const program = new Program(b, idl.metadata.address, provider);

        try {
            await program.methods.mintToken(new BN(mintAmount)).accounts({
                mint: tokenAddress,
                tokenProgram: TOKEN_PROGRAM_ID,
                tokenAccount: ataAddress,
                signer: wallet.publicKey,
            }).rpc();
            const minted: any = await program.provider.connection.getParsedAccountInfo(ataAddress);
            if (minted.value) {
                console.log(minted.value.data.parsed.info.tokenAmount.amount);
                setMintcount(minted.value.data.parsed.info.tokenAmount.amount);

            }
        }
        catch (e) {
            console.log(e);
        }



    }


    async function getTokenAccount() {
        if (!wallet) {
            return null;
        }
        const network = "https://api.devnet.solana.com";
        const connection = new Connection(network, "processed");

        const accounts = await connection.getTokenAccountsByOwner(
            wallet.publicKey,
            {
                programId: TOKEN_PROGRAM_ID,
            }
        );
        // let tempAccount = [...tokenAccounts];
        // accounts.value.forEach((e) => {
        //     const accountInfo = AccountLayout.decode(e.account.data);
        //     console.log(`${new PublicKey(accountInfo.mint)}   ${accountInfo.amount}`);
        //     // setTokenAccounts([...tokenAccounts, accountInfo.mint.toString()]);
        //     tempAccount.push(accountInfo.mint.toString());
        // })
        // setTokenAccounts([...tempAccount]);

        setTokenAccounts(
            accounts.value.map((i) =>
                AccountLayout.decode(i.account.data).mint
            ));
    };



    async function fetchAtaAccounts(tokenAccounts: []) {
        if (!wallet) {
            return null;
        }
        const provider = await getProvider();
        if (!provider) {
            return null;
        }
        let tempAccount: any = [];
        for (const token of tokenAccounts) {
            const ata = await getAssociatedTokenAddress(
                token,
                wallet.publicKey,
            )
            tempAccount.push(ata.toString());
        }

        setAtaAccounts([...tempAccount]);
    }


    async function createATA() {
        if (!wallet) {
            return null;
        }

        const provider = await getProvider();
        if (!provider) {
            return null;
        }
        const associatedTokenAccount = await getAssociatedTokenAddress(
            mintKey.publicKey,
            wallet.publicKey,
        )

        try {
            const ata_tx = new anchor.web3.Transaction().add(
                createAssociatedTokenAccountInstruction(wallet.publicKey, associatedTokenAccount, wallet.publicKey, mintKey.publicKey)
            )
            const res = await provider.sendAndConfirm(ata_tx, []);
            if (res) {
                setAtaAddress(associatedTokenAccount);
            }

        }
        catch (e) {
            console.log(e);
        }
        console.log(associatedTokenAccount.toString(), mintKey.publicKey.toString());


    }

    return (
        <div className=''>
            <header className="bg-gray-900 pattern">
                <div className="container px-6 mx-auto">
                    <nav className="flex flex-col py-2 sm:flex-row sm:justify-between sm:items-center">
                        <div>
                            <a href="#" className="text-2xl font-semibold text-white hover:text-gray-300">Token Minter</a>
                        </div>

                        <div className="flex items-center mt-2 -mx-2 sm:mt-0">
                            {wallet ? <a href="#" className="px-3 py-1 text-sm font-semibold text-white transition-colors duration-200 
                            transform border-2 rounded-md hover:bg-gray-700"><WalletMultiButton className="" /></a> : null}

                        </div>
                    </nav>

                    <div className="flex flex-col items-center py-6 lg:h-[32rem] lg:flex-row">
                        <div className="lg:w-1/2">
                            <h2 className="text-4xl font-semibold text-gray-100">CREATE AND MINT TOKEN</h2>

                            <h3 className="text-2xl font-semibold text-gray-100">
                                <span className="text-blue-400">Account</span>
                            </h3>
                            {myWallet ? <p className="mt-3 text-gray-100"><span className='text-cyan-600'>{myWallet}</span></p> : null}
                        </div>

                        <div className="flex items-center justify-center pb-6 md:py-0 md:w-1/2">
                            <div className="flex items-center mt-2 -mx-2 sm:mt-0">
                                {!wallet ? <a href="#" className="px-3 py-1 text-sm font-semibold text-white transition-colors duration-200 transform border-2 rounded-md hover:bg-gray-700"><WalletMultiButton className="" /></a> : null}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center py-6 h-[32rem]">

                        {!tokenAddress ? <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={createToken}>Create Token</button> : null}

                        {tokenAddress && !ataAddress ? <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={createATA}>Create ATA</button> : null}
                        <p></p>
                        <div className="container mx-auto px-4 sm:px-8">
                            <div className="py-8">
                                <div>
                                    <h2 className="text-2xl text-white font-semibold leading-tight">Your Tokens</h2>
                                </div>
                                <div className="-mx-4 sm:-mx-8 px-4 sm:px-8 py-4 overflow-x-auto">
                                    <div
                                        className="inline-block min-w-full shadow-md rounded-lg overflow-hidden"
                                    >
                                        <table className="min-w-full leading-normal">
                                            <thead>
                                                <tr>
                                                    <th
                                                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                                                    >
                                                        Token
                                                    </th>
                                                    <th
                                                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                                                    >
                                                        ATA
                                                    </th>

                                                    <th
                                                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                                                    >
                                                        Amount
                                                    </th>
                                                    <th
                                                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"
                                                    ></th>
                                                    <th
                                                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"
                                                    ></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    tokenAccounts.map((account: any, index: any) => {

                                                        return (
                                                            <tr key={index}>

                                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                                    <div className="flex">
                                                                        <div className="flex-shrink-0 w-10 h-10">
                                                                            <img
                                                                                className="w-full h-full rounded-full"
                                                                                src="https://cdn3d.iconscout.com/3d/premium/thumb/solana-4437052-3684819.png"
                                                                                alt=""
                                                                            />
                                                                        </div>
                                                                        <div className="ml-3">
                                                                            <p className="text-gray-600 py-2 whitespace-no-wrap">{account.toString()}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                                    <p className="text-gray-600 whitespace-no-wrap">{ataAccounts[index]}</p>
                                                                </td>

                                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                                    <p className="text-gray-600 whitespace-no-wrap">{ataAddress ? mintcount : null}</p>
                                                                </td>
                                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                                    <span
                                                                        className="relative inline-block px-3 py-1 font-semibold text-green-900 leading-tight"
                                                                    >
                                                                        <span className="relative">
                                                                            {
                                                                                ataAddress ? <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={() => {
                                                                                    MintToken(20);
                                                                                }}>Mint Token</button> : null
                                                                            }
                                                                        </span>

                                                                    </span>
                                                                </td>
                                                                <td
                                                                    className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className="inline-block text-gray-500 hover:text-gray-700"
                                                                    >
                                                                        <svg
                                                                            className="inline-block h-6 w-6 fill-current"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path
                                                                                d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm-2 6a2 2 0 104 0 2 2 0 00-4 0z"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                </td>
                                                            </tr>

                                                        )
                                                    })
                                                }

                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div >

            </header >


        </div >

    )
}

export default CreateToken