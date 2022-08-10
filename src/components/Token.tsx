import { useState, useEffect, useMemo, useRef, FC } from 'react'
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
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    AccountLayout,
} from "@solana/spl-token";

import idl from '../idl.json'

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
        if (tokenAccounts.lenght > 0) {
            setMintInput(Array(tokenAccounts?.length).fill(2))
        }
        console.log(tokenAccounts.length)
    }, [tokenAccounts]);



    useEffect(() => {
        console.log(mintInput)
    }, [mintInput]);

    useEffect(() => {
        if (!wallet) {
            setTokenAccounts([])
        }
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
            await getTokenAccount();
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

                    {navBar()}

                    <div className="flex flex-col items-center py-20 lg:py-40  lg:h-full lg:flex-col">
                        <div className="items-center flex flex-col">
                            <h2 className="text-4xl text-center leading-snug justify-center font-semibold text-gray-100">CREATE, MINT AND <br /> TRANSFER TOKEN</h2>


                            {wallet && myWallet ? <>
                                <h3 className="text-2xl font-semibold text-gray-100">
                                    <span className="text-blue-400">Account</span>
                                </h3>
                                <p className="mt-3 text-gray-100"><span className='text-cyan-600'>{myWallet}</span></p>
                            </> : null}
                        </div>

                        {!wallet ? <div className="flex items-center justify-cente mt-10 pb-6 md:py-0 ">
                            <div className="flex items-center mt-2 -mx-2 sm:mt-0">
                                <a href="#" className="px-3 py-1 text-sm font-semibold text-white transition-colors duration-200 transform border-2 rounded-md hover:bg-gray-700"><WalletMultiButton className="" /></a>
                                {/* <h2 className='text-white'>New Token - <span className='text-orange-600'>{tokenAddress}</span></h2>
                                <h2 className='text-white'>New Token - <span className='text-orange-600'>{ataAddress?.toString()}</span></h2> */}
                            </div>
                        </div> : null}
                    </div>
                    <div className="flex flex-col items-center py-6 h-full">


                        {wallet && !tokenAddress && !isRequestSending ? <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={createToken}>Create Token</button> : null}

                        {tokenAddress && !isRequestSending && !ataAddress ? <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={createATA}>Create ATA</button> : null}

                        {loadingSpinner()}

                        <p></p>


                    </div>
                </div >
            </header >
            {tokenAccounts.length > 0 ? tokenTable() : null}
            {footer()}


        </div >
    )

    function navBar() {
        return (
            <nav className="flex flex-col py-2 sm:flex-row sm:justify-between sm:items-center">
                <div>
                    <a href="#" className="text-2xl font-semibold text-white hover:text-gray-300">Token Minter</a>
                </div>

                <div className="flex items-center mt-2 -mx-2 sm:mt-0">
                    {wallet ? <a href="#" className="px-3 py-1 text-sm font-semibold text-white transition-colors duration-200 
                            transform border-2 rounded-md hover:bg-gray-700"><WalletMultiButton className="" /></a> : null}

                </div>
            </nav>
        )
    }

    function footer() {
        return (<footer className="flex justify-center px-4 text-gray-800 bg-white dark:text-white dark:bg-gray-800">
            <div className="container py-6">
                <h1 className="text-lg font-bold text-center lg:text-2xl">
                    Support Me and drop some emails <br /> for great ideas and projects
                </h1>

                <div className="flex justify-center mt-6">
                    <div className="bg-white border rounded-md focus-within:ring dark:bg-gray-800 dark:border-gray-600 focus-within:border-blue-400 focus-within:ring-blue-300 focus-within:ring-opacity-40 dark:focus-within:border-blue-300">
                        <div className="flex flex-wrap justify-between md:flex-row">
                            <input type="email" className="p-2 m-1 text-sm text-gray-700 bg-transparent appearance-none focus:outline-none focus:placeholder-transparent" placeholder="Enter your email" aria-label="Enter your email" />
                            <button className="w-full px-3 py-2 m-1 text-sm font-medium tracking-wider text-white uppercase transition-colors duration-200 transform bg-gray-800 rounded-md dark:hover:bg-gray-600 dark:bg-gray-700 lg:w-auto hover:bg-gray-700">subscribe</button>
                        </div>
                    </div>
                </div>

                <hr className="h-px mt-6 border-gray-300 border-none dark:bg-gray-700" />

                <div className="flex flex-col items-center justify-between mt-6 md:flex-row">
                    <div>
                        <a href="#" className="text-xl font-bold text-gray-800 dark:text-white hover:text-gray-700 dark:hover:text-gray-300">&copy; karan-ksrk</a>
                    </div>

                    <div className="flex mt-4 md:m-0">
                        <div className="-mx-4">
                            <a href="https://ksrk47.xyz/bio-link/" className="px-4 text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-400 hover:underline">Bio Links</a>
                            <a href="https://medium.com/@ksrk" className="px-4 text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-400 hover:underline">Blog</a>
                            <a href="https://ksrk47.xyz/" className="px-4 text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-400 hover:underline">Website</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>)
    }
    function tokenTable() {
        return (
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
        )
    }
    function tokenTable1() {
        return (
            <section className="antialiased bg-gray-100 text-gray-600 h-0 px-4">
                <div className="flex flex-col justify-center h-full">
                    <div className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-sm border border-gray-200">
                        <header className="px-5 py-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-800">Customers</h2>
                        </header>
                        <div className="p-3">
                            <div className="overflow-x-auto">
                                <table className="table-auto w-full">
                                    <thead className="text-xs font-semibold uppercase text-gray-400 bg-gray-50">
                                        <tr>
                                            <th className="p-2 whitespace-nowrap">
                                                <div className="font-semibold text-left">Name</div>
                                            </th>
                                            <th className="p-2 whitespace-nowrap">
                                                <div className="font-semibold text-left">Email</div>
                                            </th>
                                            <th className="p-2 whitespace-nowrap">
                                                <div className="font-semibold text-left">Spent</div>
                                            </th>
                                            <th className="p-2 whitespace-nowrap">
                                                <div className="font-semibold text-center">Country</div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-100">
                                        <tr>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 flex-shrink-0 mr-2 sm:mr-3"><img className="rounded-full" src="https://raw.githubusercontent.com/cruip/vuejs-admin-dashboard-template/main/src/images/user-36-05.jpg" width="40" height="40" alt="Alex Shatov" /></div>
                                                    <div className="font-medium text-gray-800">Alex Shatov</div>
                                                </div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-left">alexshatov@gmail.com</div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-left font-medium text-green-500">$2,890.66</div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-lg text-center">??</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 flex-shrink-0 mr-2 sm:mr-3"><img className="rounded-full" src="https://raw.githubusercontent.com/cruip/vuejs-admin-dashboard-template/main/src/images/user-36-06.jpg" width="40" height="40" alt="Philip Harbach" /></div>
                                                    <div className="font-medium text-gray-800">Philip Harbach</div>
                                                </div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-left">philip.h@gmail.com</div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-left font-medium text-green-500">$2,767.04</div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-lg text-center">??</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 flex-shrink-0 mr-2 sm:mr-3"><img className="rounded-full" src="https://raw.githubusercontent.com/cruip/vuejs-admin-dashboard-template/main/src/images/user-36-07.jpg" width="40" height="40" alt="Mirko Fisuk" /></div>
                                                    <div className="font-medium text-gray-800">Mirko Fisuk</div>
                                                </div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-left">mirkofisuk@gmail.com</div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-left font-medium text-green-500">$2,996.00</div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-lg text-center">??</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 flex-shrink-0 mr-2 sm:mr-3"><img className="rounded-full" src="https://raw.githubusercontent.com/cruip/vuejs-admin-dashboard-template/main/src/images/user-36-08.jpg" width="40" height="40" alt="Olga Semklo" /></div>
                                                    <div className="font-medium text-gray-800">Olga Semklo</div>
                                                </div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-left">olga.s@cool.design</div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-left font-medium text-green-500">$1,220.66</div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-lg text-center">??</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 flex-shrink-0 mr-2 sm:mr-3"><img className="rounded-full" src="https://raw.githubusercontent.com/cruip/vuejs-admin-dashboard-template/main/src/images/user-36-09.jpg" width="40" height="40" alt="Burak Long" /></div>
                                                    <div className="font-medium text-gray-800">Burak Long</div>
                                                </div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-left">longburak@gmail.com</div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-left font-medium text-green-500">$1,890.66</div>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                                <div className="text-lg text-center">??</div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section >
        )
    }

    function loadingSpinner() {
        return (
            <>
                {isRequestSending ? <div role="status">
                    <svg aria-hidden="true" className="mr-2 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                    </svg>
                </div> : null}</>
        )

    }
}





export default CreateToken