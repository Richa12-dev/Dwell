// src/utils/authFetch.js
import { store } from '../Redux/store';
import { updateTokens, clearLoginData } from '../Redux/Login/loginSlice';
import { refreshToken } from '../Redux/Login/loginservices';
import { resetRoot } from '../navigation/RouterServices';

let isRefreshing = false;
let pendingRequests = [];

const processQueue = (error, token = null) => {
    pendingRequests.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    pendingRequests = [];
};

export const authFetch = async (url, options = {}) => {
    const state = store.getState();
    const accessToken = state.loginData?.accessToken || state.loginData?.token;

    // Add auth header
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    // If not 401, return as-is
    if (response.status !== 401) return response;

    // Token expired — try refresh
    const refreshTokenValue = state.loginData?.refreshToken;
    if (!refreshTokenValue) {
        store.dispatch(clearLoginData());
        resetRoot('Login');
        return response;
    }

    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            pendingRequests.push({
                resolve: (newToken) => {
                    headers['Authorization'] = `Bearer ${newToken}`;
                    resolve(fetch(url, { ...options, headers }));
                },
                reject,
            });
        });
    }

    isRefreshing = true;

    try {
        // ✅ Call refresh via Redux thunk instead of direct API call
        const result = await store.dispatch(
            refreshToken({ refreshToken: refreshTokenValue })
        ).unwrap();

        // unwrap() gives you the payload directly — { accessToken, refreshToken }
        const newAccessToken = result.accessToken;

        isRefreshing = false;
        processQueue(null, newAccessToken);

        // Retry original request with new token
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        return fetch(url, { ...options, headers });

    } catch (error) {
        // Refresh failed — Redux already clears tokens in rejected case
        isRefreshing = false;
        processQueue(new Error('Refresh failed'));
        store.dispatch(clearLoginData());
        resetRoot('Login');
        return response;
    }
};
