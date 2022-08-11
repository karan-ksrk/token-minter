import { createSlice, createAsyncThunk, AnyAction } from '@reduxjs/toolkit';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, BN, AnchorProvider } from '@project-serum/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';

import {
    TOKEN_PROGRAM_ID,
    MINT_SIZE,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    AccountLayout,
} from "@solana/spl-token";

const network = "https://api.devnet.solana.com";

const initialState = {
    tokenAccounts: [],
    ataAccounts: [],
    isRequestSending: false,
    mintInputs: [],
    provider: typeof AnchorProvider,
}

export const getProvider = createAsyncThunk('token/getProvider', async (wallet: AnchorWallet) => {

    const connection = new Connection(network, 'processed')

    const provider = new AnchorProvider(
        connection, wallet, { "preflightCommitment": "processed" }
    )
    return provider
})

export const getTokens = createAsyncThunk('token/getTokenAccount', async (wallet: AnchorWallet, { dispatch }) => {

    const connection = new Connection(network, 'processed')

    const accounts = await connection.getTokenAccountsByOwner(
        wallet.publicKey,
        {
            programId: TOKEN_PROGRAM_ID,
        }
    )
    console.log(accounts)
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
    },

})


export default tokenSlice.reducer;