import { createSlice, createAsyncThunk, AnyAction } from '@reduxjs/toolkit';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, BN, AnchorProvider, Provider } from '@project-serum/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import * as web3 from "@solana/web3.js";
import * as anchor from '@project-serum/anchor';
import * as mpl from "@metaplex-foundation/mpl-token-metadata"

import {
    TOKEN_PROGRAM_ID,
    MINT_SIZE,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    createBurnInstruction,
    createCloseAccountInstruction,
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

export const burnToken = createAsyncThunk('token/burnToken', async (data: any, { dispatch }) => {

    const ataAddress: PublicKey = data.ataAddress;
    const tokenAddress: PublicKey = data.tokenAddress;
    const wallet: AnchorWallet = data.wallet;
    const amount: number = data.amount;
    const provider = data.provider;

    const tx = new anchor.web3.Transaction().add(
        createBurnInstruction(
            ataAddress,
            tokenAddress,
            wallet.publicKey,
            amount,
        )
    )
    const res = await provider?.sendAndConfirm(tx, []);
    dispatch(getTokens(wallet));
})

export const closeAccount = createAsyncThunk('token/closeAccount', async (data: any, { dispatch }) => {
    // account: PublicKey, destination: PublicKey, authority: PublicKey,

    const provider = data.provider;
    const authority: AnchorWallet = data.authority;
    const ataAddress: PublicKey = data.ataAddress;
    const destination: PublicKey = data.destination;

    const tx = new anchor.web3.Transaction().add(
        createCloseAccountInstruction(
            ataAddress,
            destination,
            authority.publicKey,
        )
    )
    const res = await provider?.sendAndConfirm(tx, []);
    dispatch(getTokens(authority));
})

export const createToken = createAsyncThunk('token/createToken', async (data: any, { dispatch }) => {

    const a = JSON.stringify(idl);
    const b = JSON.parse(a);
    const provider = data.provider;
    const wallet: AnchorWallet = data.wallet;
    const mintKey = anchor.web3.Keypair.generate();

    // Meta Data
    const mint = mintKey.publicKey;
    const seed1 = Buffer.from(anchor.utils.bytes.utf8.encode("metadata"));
    const seed2 = Buffer.from(mpl.PROGRAM_ID.toBytes());
    const seed3 = Buffer.from(mint.toBytes());
    const [metadataPDA, _bump] = web3.PublicKey.findProgramAddressSync([seed1, seed2, seed3], mpl.PROGRAM_ID);

    const accounts = {
        metadata: metadataPDA,
        mint,
        mintAuthority: wallet!.publicKey,
        payer: wallet!.publicKey,
        updateAuthority: wallet!.publicKey,
    }

    const dataV2 = {
        name: data.name,
        symbol: data.symbol,
        uri: data.uri,
        // we don't need that
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null
    }

    const args = {
        createMetadataAccountArgsV2: {
            data: dataV2,
            isMutable: true
        }
    };

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
        createAssociatedTokenAccountInstruction(wallet.publicKey, associatedTokenAccount, wallet.publicKey, mintKey.publicKey),
        mpl.createCreateMetadataAccountV2Instruction(accounts, args),
    );
    const res = await provider?.sendAndConfirm(token_txn, [mintKey]);
    dispatch(getTokens(wallet));
    if (res) {
        return mintKey;
    }

    // const args = {
    //     updateMetadataAccountArgsV2: {
    //         data: dataV2,
    //         isMutable: true,
    //         updateAuthority: wallet!.publicKey,
    //         primarySaleHappened: true
    //     }
    // };
    // ix = mpl.createUpdateMetadataAccountV2Instruction(accounts, args)
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
                    "data": accountInfo,

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