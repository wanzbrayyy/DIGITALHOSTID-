const axios = require('axios');
const logger = require('../utils/logger');
const { URLSearchParams } = require('url');

const apiClient = axios.create({
    baseURL: process.env.RDASH_API_URL,
    timeout: 30000,
    auth: { username: process.env.RDASH_API_USERNAME, password: process.env.RDASH_API_PASSWORD }
});

const handleApiError = (error, functionName) => {
    if (error.code === 'ECONNABORTED') {
        const timeoutError = `API TIMEOUT in ${functionName}: ${error.message}`;
        console.error(timeoutError);
        logger.error(timeoutError);
        throw new Error('Koneksi ke API gateway timeout.');
    }
    const errorData = { message: error.message, responseData: error.response?.data, status: error.response?.status };
    console.error(`RAW API ERROR in ${functionName}:`, JSON.stringify(error.response?.data, null, 2));
    logger.error(`API ERROR in ${functionName}`, errorData);
    const apiErrorMessage = error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(' ') : error.response?.data?.message;
    throw new Error(apiErrorMessage || 'Terjadi kesalahan pada server API.');
};

const get = async (url, params = {}, functionName) => {
    try {
        const response = await apiClient.get(url, { params });
        return response.data;
    } catch (error) { handleApiError(error, functionName); }
};
const post = async (url, data, functionName) => {
    try {
        const params = new URLSearchParams(Object.entries(data).filter(([_, v]) => v != null));
        const response = await apiClient.post(url, params);
        return response.data;
    } catch (error) { handleApiError(error, functionName); }
};
const put = async (url, data, functionName) => {
    try {
        const params = new URLSearchParams(Object.entries(data).filter(([_, v]) => v != null));
        const response = await apiClient.put(url, params);
        return response.data;
    } catch (error) { handleApiError(error, functionName); }
};
const del = async (url, data = {}, functionName) => {
    try {
        const response = await apiClient.delete(url, { data: new URLSearchParams(data) });
        return response.data;
    } catch (error) { handleApiError(error, functionName); }
};

const createCustomer = (data) => post('/customers', data, 'createCustomer');
const showCustomer = (id) => get(`/customers/${id}`, {}, 'showCustomer');
const updateCustomer = (id, data) => put(`/customers/${id}`, data, 'updateCustomer');

const listDomains = (params) => get('/domains', params, 'listDomains');
const registerDomain = (data) => post('/domains', data, 'registerDomain');
const transferDomain = (data) => post('/domains/transfer', data, 'transferDomain');
const showDomainById = (id) => get(`/domains/${id}`, {}, 'showDomainById');
const resendVerificationEmail = (id) => post(`/domains/${id}/verification/resend`, {}, 'resendVerificationEmail');
const lockDomain = (id, reason = '') => put(`/domains/${id}/locked`, { reason }, 'lockDomain');
const unlockDomain = (id) => del(`/domains/${id}/locked`, {}, 'unlockDomain');
const suspendDomain = (id, reason) => put(`/domains/${id}/suspended`, { type: 2, reason }, 'suspendDomain');
const unsuspendDomain = (id) => del(`/domains/${id}/suspended`, {}, 'unsuspendDomain');
const getDomainAuthCode = (id) => get(`/domains/${id}/auth_code`, {}, 'getDomainAuthCode');

// **FUNGSI BARU UNTUK MERESET AUTH CODE**
const resetDomainAuthCode = (id, newAuthCode) => put(`/domains/${id}/auth_code`, { auth_code: newAuthCode }, 'resetDomainAuthCode');

const getDomainWhois = (domainName) => get('/domains/whois', { domain: domainName }, 'getDomainWhois');
const updateNameserver = (id, data) => put(`/domains/${id}/ns`, data, 'updateNameserver');

const checkDomainAvailability = async (domain) => {
    try {
        const response = await get('/domains/availability', { domain }, 'checkDomainAvailability');
        const result = response?.data?.[0];
        if (!result) throw new Error('Invalid API response');
        return { name: result.name, status: result.available === 1 ? 'available' : 'taken' };
    } catch (error) { handleApiError(error, 'checkDomainAvailability'); }
};

const createDnsZone = (id) => post(`/domains/${id}/dns`, {}, 'createDnsZone');
const getDnsRecords = (id) => get(`/domains/${id}/dns`, {}, 'getDnsRecords');
const createDnsRecord = (id, data) => put(`/domains/${id}/dns`, data, 'createDnsRecord');
const deleteDnsRecord = (id, data) => del(`/domains/${id}/dns/record`, data, 'deleteDnsRecord');

const listSslProductsWithPrices = (params) => get('/ssl/prices', params, 'listSslProductsWithPrices');
const showSslProductWithPrice = async (priceId) => {
    try {
        const response = await listSslProductsWithPrices({ limit: 100 });
        const foundProduct = response.data.find(item => item.id === parseInt(priceId, 10));
        if (!foundProduct) throw new Error(`Produk SSL dengan ID harga ${priceId} tidak ditemukan.`);
        return foundProduct; 
    } catch (error) { handleApiError(error, 'showSslProductWithPrice'); }
};
const generateCsr = (data) => post('/ssl/csr/generate', data, 'generateCsr');
const orderSsl = (data) => post('/ssl/orders', data, 'orderSsl');

const listAllDomainPrices = (params) => get('/account/prices', params, 'listAllDomainPrices');

module.exports = {
    createCustomer, showCustomer, updateCustomer,
    listDomains, registerDomain, transferDomain, showDomainById, resendVerificationEmail,
    lockDomain, unlockDomain, suspendDomain, unsuspendDomain, checkDomainAvailability, updateNameserver,
    getDomainAuthCode, getDomainWhois,
    createDnsZone, getDnsRecords, createDnsRecord, deleteDnsRecord,
    listSslProductsWithPrices, showSslProductWithPrice, generateCsr, orderSsl,
    listAllDomainPrices,
    getDomainAuthCode,
    resetDomainAuthCode
};