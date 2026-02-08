
import { combineReducers, configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { persistReducer, persistStore } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

export type AuthState = { token: string|null; user: { username: string; role: 'admin'|'sales'|'support' }|null }

const initialState: AuthState = { token: null, user: null }

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ token: string; user: AuthState['user'] }>) => {
      state.token = action.payload.token
      state.user = action.payload.user
    },
    logout: (state) => { state.token = null; state.user = null }
  }
})

export const { loginSuccess, logout } = authSlice.actions

const rootReducer = combineReducers({ auth: authSlice.reducer })
const persistConfig = { key: 'root', storage, whitelist: ['auth'] }
const persisted = persistReducer(persistConfig, rootReducer)

export const store = configureStore({ reducer: persisted })
export const persistor = persistStore(store)
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
