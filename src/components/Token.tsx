import { useState, useEffect } from 'react'
import * as anchor from "@project-serum/anchor";
import { useAnchorWallet } from '@solana/wallet-adapter-react';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';


import '../App.css'

import { useSelector, useDispatch } from 'react-redux';
import { getProvider, getTokens, getAtaAccount, mintToken, createToken, burnToken, closeAccount } from '../features/token/tokenSlice';


const CreateToken = () => {
  const [mintInputs, setMintInputs] = useState<number[]>([]);
  const [burnInputs, setBurnInputs] = useState<number[]>([]);
  // const mintKey: PublicKey = new anchor.web3.PublicKey("C3RaB4g1uSiyA9UdGTMkVGMAGJdVRLQCxWXP3MTmgNcx");

  const wallet = useAnchorWallet();
  const dispatch = useDispatch<any>();
  const provider = useSelector((state: any) => state.token.provider);
  const tokenAccounts = useSelector((state: any) => state.token.tokenAccounts);
  const ataAccounts = useSelector((state: any) => state.token.ataAccounts);
  const currentMintKey = useSelector((state: any) => state.token.currentMintKey);
  const isTokenRequestSending = useSelector((state: any) => state.token.isTokenRequestSending);


  const [successModalClass, setSuccessModalClass] = useState<string>('hidden')
  const [tokenModalClass, setTokenModalClass] = useState<string>('hidden')

  useEffect(() => {
    dispatch(getAtaAccount({ "wallet": wallet, "tokenAccounts": tokenAccounts }));
    setMintInputs(Array(tokenAccounts?.length).fill(0))
    setBurnInputs(Array(tokenAccounts?.length).fill(0))
  }, [tokenAccounts]);

  useEffect(() => {
    dispatch(getProvider(wallet!));
    dispatch(getTokens(wallet!));

  }, [wallet]);


  useEffect(() => {
    if (currentMintKey) {
      toggleSuccessModal();
    }
  }, [currentMintKey])


  const MintToken = (mintAmount: number, ataAddress: any, tokenAddress: any) => {
    dispatch(mintToken(
      {
        'provider': provider,
        'tokenAddress': tokenAddress,
        'ataAddress': ataAddress,
        'mintAmount': mintAmount,
        'wallet': wallet,
      }
    ))
  }

  const BurnToken = (ataAddress: any, tokenAddress: any, amount: number) => {
    dispatch(burnToken({
      'ataAddress': new anchor.web3.PublicKey(ataAddress),
      'tokenAddress': tokenAddress,
      'provider': provider,
      'amount': amount,
      'wallet': wallet,
    }))
  }


  const CloseAccount = (ataAddress: any, destination: any) => {

    dispatch(closeAccount({
      'ataAddress': new anchor.web3.PublicKey(ataAddress),
      'destination': new anchor.web3.PublicKey("5akU31DzhNg125mahJ215XkpzMapZYEZeZmwTjE6Z3FF"),
      'provider': provider,
      'authority': wallet,
    }))
  }

  const toggleSuccessModal = () => {
    setSuccessModalClass(successModalClass == '' ? 'hidden' : '');
  }

  const toggleTokenFormModal = () => {
    setTokenModalClass(tokenModalClass == '' ? 'hidden' : '');
  }

  const INITIALIZE = false;


  return (
    <div className=''>

      <header className="bg-gray-900 pattern">

        <div className="container px-6 mx-auto">
          {navBar()}


          <div className="flex flex-col items-center py-20 lg:py-40  lg:h-full lg:flex-col">
            <div className="items-center flex flex-col">
              <h2 className="text-4xl text-center leading-snug justify-center font-semibold text-gray-100">CREATE, MINT AND <br /> TRANSFER TOKEN</h2>


              {wallet ? <>
                <h3 className="text-2xl font-semibold text-gray-100">
                  <span className="text-blue-400">Account</span>
                </h3>
                <p className="mt-3 text-gray-100"><span className='text-cyan-600'>{wallet.publicKey.toString()}</span></p>
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


            {wallet && !isTokenRequestSending ? <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={toggleTokenFormModal}>Create Token</button> : null}

            {tokenForm()}

            {customModal()}

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
          {wallet ? <a href="#" className="px-3 py-0 text-sm font-semibold text-white transition-colors duration-200 
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
                      className=" py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Amount
                    </th>
                    <th
                      className=" py-3 border-b-2 border-gray-200 bg-gray-100"
                    ></th>
                    <th
                      className="py-3 border-b-2 border-gray-200 bg-gray-100"
                    ></th>
                    <th
                      className=" py-3 border-b-2 border-gray-200 bg-gray-100"
                    ></th>
                  </tr>
                </thead>
                <tbody>
                  {
                    tokenAccounts.map((account: any, index: any) => {

                      return (
                        <tr key={index}>

                          <td className="px-5 border-b border-gray-200 bg-slate-200 text-sm">
                            <div className="flex">
                              <div className="flex-shrink-0 w-10 h-10">
                                <img
                                  className="w-full h-full rounded-full"
                                  src="https://cdn3d.iconscout.com/3d/premium/thumb/solana-4437052-3684819.png"
                                  alt=""
                                />
                              </div>
                              <div className="ml-3">
                                <p className="text-gray-600 truncate  py-2 whitespace-no-wrap">{index + 1} - {account.token.toString()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5  border-b border-gray-200 bg-slate-200 text-sm">
                            <p className="text-gray-600 whitespace-no-wrap">{ataAccounts[index]}</p>
                          </td>

                          <td className="border-b border-gray-200 bg-slate-200 text-sm">
                            <p className="text-gray-600 whitespace-no-wrap">{account.supply.toString()}</p>
                          </td>
                          <td className="border-b border-gray-200 bg-slate-200 text-sm">
                            <span className="relative inline-block py-1 font-semibold text-green-900 leading-tight" >
                              <input type="number" min="0" className="shadow appearance-none border w-14 rounded py-2 px-3 mr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="0" value={mintInputs[index] || 0} onChange={(e) => {
                                setMintInputs(mintInputs.map((el: number, idx: number) => {
                                  if (idx === index) {
                                    el = parseInt(e.target.value)
                                  }
                                  return el
                                }))

                              }} />
                              <span className="relative">
                                <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={() => {
                                  MintToken(mintInputs[index], ataAccounts[index], account.token);
                                }}>Mint</button>
                              </span>
                            </span>
                          </td>
                          {account.supply != 0 ? <td className="border-b border-gray-200 bg-slate-200 text-sm">
                            <span className="relative inline-block py-1 font-semibold text-green-900 leading-tight" >
                              <input type="number" min="0" max={account.supply.toString()} className="shadow appearance-none border w-14 rounded py-2 px-3 mr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="0" value={burnInputs[index] || 0} onChange={(e) => {
                                setBurnInputs(burnInputs.map((el: number, idx: number) => {
                                  if (idx === index) {
                                    el = parseInt(e.target.value)
                                  }
                                  return el
                                }))

                              }} />
                              <span className="relative">
                                <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={() => {
                                  BurnToken(ataAccounts[index], account.token, burnInputs[index]);
                                }}>Burn </button>
                              </span>
                            </span>
                          </td> : <td className="border-b border-gray-200 bg-slate-200 text-sm">
                            <span className="relative inline-block py-1 font-semibold text-green-900 leading-tight" >
                              <span className="relative">
                                <button className='px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80' onClick={() => {
                                  CloseAccount(ataAccounts[index], ataAccounts[index]);
                                }}>Close </button>
                              </span>
                            </span>
                          </td>}


                          <td className="px-5 py-5 border-b border-gray-200 bg-slate-200 text-sm text-right" >
                            <button type="button" className="inline-block text-gray-500 hover:text-gray-700" >
                              <svg className="inline-block h-6 w-6 fill-current" viewBox="0 0 24 24" >
                                <path d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm-2 6a2 2 0 104 0 2 2 0 00-4 0z" />
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



            <div className="flex justify-center py-4">
              <a href="#" className="flex items-center px-4 py-2 mx-1 text-gray-500 bg-white rounded-md cursor-not-allowed dark:bg-gray-900 dark:text-gray-600">
                previous
              </a>

              <a href="#" className="items-center hidden px-4 py-2 mx-1 text-gray-700 transition-colors duration-200 transform bg-white rounded-md sm:flex dark:bg-gray-900 dark:text-gray-200 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-gray-200">
                1
              </a>

              <a href="#" className="items-center hidden px-4 py-2 mx-1 text-gray-700 transition-colors duration-200 transform bg-white rounded-md sm:flex dark:bg-gray-900 dark:text-gray-200 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-gray-200">
                2
              </a>

              <a href="#" className="items-center hidden px-4 py-2 mx-1 text-gray-700 transition-colors duration-200 transform bg-white rounded-md sm:flex dark:bg-gray-900 dark:text-gray-200 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-gray-200">
                3
              </a>

              <a href="#" className="flex items-center px-4 py-2 mx-1 text-gray-700 transition-colors duration-200 transform bg-white rounded-md dark:bg-gray-900 dark:text-gray-200 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-gray-200">
                Next
              </a>
            </div>


          </div>

        </div>



      </div>
    )
  }


  function customModal() {
    return (
      <div className="relative z-10 flex justify-center items-center">
        <div id="menu" className={`${successModalClass} w-full h-full bg-gray-900 bg-opacity-80 top-0 fixed sticky-0`}>
          <div className="2xl:container  2xl:mx-auto py-48 px-4 md:px-28 flex justify-center items-center">
            <div className="w-96 md:w-auto dark:bg-gray-800 relative flex flex-col justify-center items-center bg-white py-16 px-4 md:px-24 xl:py-24 xl:px-36">
              <div role="banner">

              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#c8e6c9" d="M44,24c0,11-9,20-20,20S4,35,4,24S13,4,24,4S44,13,44,24z" /><polyline fill="none" stroke="#4caf50" strokeMiterlimit="10" strokeWidth="4" points="14,24 21,31 36,16" /></svg>
              <div className="mt-4">
                <h1 role="main" className="text-xl dark:text-white lg:text-2xl font-semibold leading-7 lg:leading-9 text-center text-gray-800">Congrats</h1>
              </div>

              <a href={`https://solscan.io/account/${currentMintKey?.publicKey.toString()}?cluster=devnet`} target="__blank" className="mt-6 dark:text-white dark:hover:border-white text-base leading-normal lg:leading-relaxed focus:outline-none hover:border-gray-800 focus:border-gray-800 border-b border-transparent text-center text-gray-800">
                Your new token <br /> <span className='text-green-300 text-xs lg:text-xl'>
                  {currentMintKey ? currentMintKey.publicKey.toString() : null}</span> </a>
              <button onClick={() => {

                toggleSuccessModal();

              }} className="text-gray-800 dark:text-gray-400 absolute top-8 right-8 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800" aria-label="close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function loadingSpinner() {
    return (
      <>
        {isTokenRequestSending ? <div role="status">
          <svg aria-hidden="true" className="mr-2 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
          </svg>
        </div> : null}</>
    )

  }

  function tokenForm() {
    return (
      <div className="relative flex justify-center items-center z-20">

        <div className={`${tokenModalClass} w-full h-full bg-gray-900 bg-opacity-80 top-0 fixed sticky-0`}>
          <div className="2xl:container  2xl:mx-auto xl:py-10 px-4 md:px-28 flex justify-center items-center">
            <div className="w-96 md:w-auto dark:bg-gray-800 relative flex flex-col justify-center items-center bg-white py-16 px-4 md:px-24 xl:py-10">
              <div role="banner">
                <img className="w-16" src="https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png" alt="Solana Logo" />
              </div>
              <div className="mt-12">
                <h1 role="main" className="text-3xl dark:text-white lg:text-4xl font-semibold leading-7 lg:leading-9 text-center text-gray-800">Add metadata for your token</h1>
              </div>
              <div className="mt">
                <p className="mt-6 sm:w-80 text-base dark:text-white leading-7 text-center text-gray-800">Please, accept these sweeties to continue enjoying our site!</p>
                <div className="mb-4">
                  <label className="block text-zinc-400 text-sm font-bold mb-2">
                    Name
                  </label>
                  <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" placeholder="Name" />
                </div>
                <div className="mb-4">
                  <label className="block text-zinc-400 text-sm font-bold mb-2">
                    Symbol
                  </label>
                  <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" placeholder="Symbol" />
                </div>
                <label className="block text-zinc-400 text-sm font-bold mb-2">
                  Logo
                </label>
                <label className="w-full flex flex-col items-center  py-3 mx-auto bg-white text-blue rounded-lg shadow-lg tracking-wide uppercase border border-blue cursor-pointer hover:bg-blue hover:text-white">
                  <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                  </svg>
                  <span className="mt-2 text-base leading-normal">Select a logo</span>
                  <input type='file' className="hidden" />
                </label>


              </div>
              <button className="w-full dark:text-gray-800 dark:hover:bg-gray-100 dark:bg-white sm:w-auto mt-14 text-base leading-4 text-center text-white py-6 px-16 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 bg-gray-800 hover:bg-black" onClick={
                () => {
                  dispatch(createToken({ "provider": provider, "wallet": wallet }));
                }}>Create Token</button>
              <a href="" className="mt-6 dark:text-white dark:hover:border-white text-base leading-none focus:outline-none hover:border-gray-800 focus:border-gray-800 border-b border-transparent text-center text-gray-800">Nope.. I am on a diet</a>
              <button onClick={toggleTokenFormModal} className="text-gray-800 dark:text-gray-400 absolute top-8 right-8 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800" aria-label="close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div >

    )
  }
}





export default CreateToken