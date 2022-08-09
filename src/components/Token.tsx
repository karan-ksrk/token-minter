import { useState, useEffect, useMemo, useRef } from 'react'
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
    const [isRequestSending, setIsRequestSending] = useState<boolean>(false);
    const mintKey = useMemo(() => anchor.web3.Keypair.generate(), []);
    const [mintInput, setMintInput] = useState<number[]>([]);
    // const mintKey: PublicKey = new anchor.web3.PublicKey("C3RaB4g1uSiyA9UdGTMkVGMAGJdVRLQCxWXP3MTmgNcx");
    const wallet = useAnchorWallet();
    const [mintcount, setMintcount] = useState<number>(0);


    useEffect(() => {
        fetchAtaAccounts(tokenAccounts);
        // if (tokenAccounts.lenght > 0) {
        setMintInput(Array(tokenAccounts?.length).fill(2))
        // }
        console.log(tokenAccounts.length)
    }, [tokenAccounts]);



    useEffect(() => {
        console.log(mintInput)
    }, [mintInput]);

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
        setIsRequestSending(true);

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

        try {

            const res = await provider?.sendAndConfirm(mint_tx, [mintKey]);
            if (res) {
                setTokenAddress(mintKey.publicKey.toString());

            }
            

        } catch (e) {
            console.log(e);
        }
        setIsRequestSending(false);
        await getTokenAccount();




    }


    async function MintToken(mintAmount: number, ataAddress: any, tokenAddress: any) {
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
            accounts.value.map((i) => {
                const accountInfo = AccountLayout.decode(i.account.data);
                return {
                    "token": accountInfo.mint,
                    "supply": accountInfo.amount,
                    "new_mint": 100,
                }
            }
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
                token["token"],
                wallet.publicKey,
            )
            tempAccount.push(ata.toString());
        }

        setAtaAccounts([...tempAccount]);
    }

    function EditMintInput(id: number, value: number) {
        setTokenAccounts(tokenAccounts.map((e: any, index: number) => {
            if (index === id) {
                e.new_mint = value;
            }
            return e;
        }))
    }

    async function createATA() {
        if (!wallet) {
            return null;
        }

        const provider = await getProvider();
        if (!provider) {
            return null;
        }
        setIsRequestSending(true);
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
        setIsRequestSending(false);

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

                        {!tokenAddress && !isRequestSending ? <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={createToken}>Create Token</button> : null}

                        {tokenAddress && !isRequestSending && !ataAddress ? <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={createATA}>Create ATA</button> : null}

                        {isRequestSending ? <div role="status">
                            <svg aria-hidden="true" className="mr-2 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                            </svg>
                        </div> : null}

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
                                                                            <p className="text-gray-600 py-2 whitespace-no-wrap">{index + 1} - {account.token.toString()}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                                    <p className="text-gray-600 whitespace-no-wrap">{ataAccounts[index]}</p>
                                                                </td>

                                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                                    <p className="text-gray-600 whitespace-no-wrap">{account.supply.toString()}</p>
                                                                </td>
                                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                                    <span
                                                                        className="relative inline-block px-3 py-1 font-semibold text-green-900 leading-tight"
                                                                    >
                                                                        <input type="number" className="shadow appearance-none border w-14 rounded py-2 px-3 mr-6 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="0" value={mintInput[index]} onChange={(e) => {
                                                                            // setMintInput(parseInt(e.target.value))
                                                                            // EditMintInput(index, parseInt(e.target.value))
                                                                            setMintInput(mintInput.map((el: number, idx: number) => {
                                                                                if (idx === index) {
                                                                                    el = parseInt(e.target.value)
                                                                                }
                                                                                return el
                                                                            }))

                                                                        }} />
                                                                        <span className="relative">
                                                                            <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={() => {
                                                                                MintToken(mintInput[index], ataAccounts[index], account.token);
                                                                            }}>Mint Token</button>

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