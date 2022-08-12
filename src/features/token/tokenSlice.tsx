import { useMemo } from 'react';
import { createSlice, createAsyncThunk, AnyAction } from '@reduxjs/toolkit';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, BN, AnchorProvider, Provider } from '@project-serum/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@project-serum/anchor';

import {
    TOKEN_PROGRAM_ID,
    MINT_SIZE,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    AccountLayout,
} from "@solana/spl-token";

import idl from '../../idl.json';

const network = "https://api.devnet.solana.com";

const initialState = {
    tokenAccounts: [],
    ataAccounts: [],
    isRequestSending: false,
    mintInputs: [],
    provider: typeof AnchorProvider,
    currentMintKey: null,
    isTokenRequestSending: false,
}

export const getProvider = createAsyncThunk('token/getProvider', async (wallet: AnchorWallet) => {

    const connection = new Connection(network, 'processed')

    const provider = new AnchorProvider(
        connection, wallet, { "preflightCommitment": "processed" }
    )
    return provider
})

export const getTokens = createAsyncThunk('token/getTokenAccount', async (wallet: AnchorWallet) => {

    const connection = new Connection(network, 'processed')

    const accounts = await connection.getTokenAccountsByOwner(
        wallet.publicKey,
        {
            programId: TOKEN_PROGRAM_ID,
        }
    )
    return accounts


})

export const getAtaAccount = createAsyncThunk('token/getATAAccount', async (data: any) => {
    const wallet = data.wallet;
    const tokenAccounts = data.tokenAccounts;
    let ataAccounts: any = [];
    for (const token of tokenAccounts) {
        const ata = await getAssociatedTokenAddress(
            token['token'],
            wallet.publicKey,
        ).then(res => { ataAccounts.push(res.toString()) }
        ).catch(err => { ataAccounts.push('No ATA') })

    }
    return [...ataAccounts];
})

export const mintToken = createAsyncThunk('token/mintToken', async (data: any, { dispatch }) => {
    const a = JSON.stringify(idl)
    const b = JSON.parse(a)
    const provider: Provider = data.provider;
    const tokenAddress: PublicKey = data.tokenAddress;
    const mintAmount: number = data.mintAmount;
    const ataAddress: PublicKey = data.ataAddress;
    const wallet: AnchorWallet = data.wallet;
    const program = new Program(b, idl.metadata.address, provider);

    try {
        await program.methods.mintToken(new BN(mintAmount)).accounts({
            mint: tokenAddress,
            tokenProgram: TOKEN_PROGRAM_ID,
            tokenAccount: ataAddress,
            signer: wallet.publicKey
        }).rpc();

        dispatch(getTokens(wallet));
    }
    catch (err) {
        console.log(err)
    }
})

export const createToken = createAsyncThunk('token/createToken', async (data: any, { dispatch }) => {

    const a = JSON.stringify(idl);
    const b = JSON.parse(a);
    const provider = data.provider;
    const wallet: AnchorWallet = data.wallet;
    const mintKey = anchor.web3.Keypair.generate();

    const program = new Program(b, idl.metadata.address, provider);
    const lamports: number = await program.provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const associatedTokenAccount = await getAssociatedTokenAddress(
        mintKey.publicKey,
        wallet.publicKey,
    )

    const token_txn = new anchor.web3.Transaction().add(
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
        createAssociatedTokenAccountInstruction(wallet.publicKey, associatedTokenAccount, wallet.publicKey, mintKey.publicKey)
    );
    // try {
    const res = await provider?.sendAndConfirm(token_txn, [mintKey]);
    dispatch(getTokens(wallet));
    if (res) {
        return mintKey;
    }
    // } catch (e) {
    //     console.log(e);
    // }
})


const tokenSlice = createSlice({
    name: 'token',
    initialState,
    reducers: {

    },
    extraReducers: builder => {
        builder.addCase(getProvider.fulfilled, (state, action: AnyAction) => {
            state.provider = action.payload!
        })

        builder.addCase(getTokens.fulfilled, (state, action: AnyAction) => {
            const accounts = action.payload!
            state.tokenAccounts = accounts.value.map((info: any) => {
                const accountInfo = AccountLayout.decode(info.account.data);
                return {
                    "token": accountInfo.mint,
                    "supply": accountInfo.amount,
                    "new_mint": 100,
                }
            })
        })
        builder.addCase(getAtaAccount.fulfilled, (state, action: AnyAction) => {
            state.ataAccounts = action.payload;
        })
        builder.addCase(createToken.pending, (state) => {
            state.isTokenRequestSending = true;
        })
        builder.addCase(createToken.fulfilled, (state, action: AnyAction) => {
            state.isTokenRequestSending = false;
            state.currentMintKey = action.payload;
        })
        builder.addCase(createToken.rejected, (state, action: AnyAction) => {
            console.log(action.payload);
            state.isTokenRequestSending = false;
        })
    },

})


export default tokenSlice.reducer;
export const { } = tokenSlice.actions;