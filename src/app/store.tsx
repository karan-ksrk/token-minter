import { configureStore } from "@reduxjs/toolkit";
import tokenReducer from "../features/token/tokenSlice";

const store = configureStore({
    reducer: {
        token: tokenReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

export default store;