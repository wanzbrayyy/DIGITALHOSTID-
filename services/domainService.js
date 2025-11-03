const axios = require('axios');
const logger = require('../utils/logger');

const apiClient = axios.create({
    baseURL: process.env.RDASH_API_URL,
    timeout: 15000,
    auth: {
        username: process.env.RDASH_API_USERNAME,
        password: process.env.RDASH_API_PASSWORD
    }
});

const handleApiError = (error, functionName) => {
    const errorData = {
        message: error.message,
        responseData: error.response ? error.response.data : 'No response data',
        status: error.response ? error.response.status : 'No response status'
    };
    logger.error(`API ERROR in ${functionName}`, errorData);
    if (error.code === 'ECONNABORTED') throw new Error('Koneksi ke API gateway timeout.');
    const apiErrorMessage = error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(' ') : error.response?.data?.message;
    throw new Error(apiErrorMessage || 'Terjadi kesalahan pada server API.');
};

const createCustomer = async (customerData) => { try { const response = await apiClient.post('/customers', customerData); return response.data; } catch (error) { handleApiError(error, 'createCustomer'); }};
const showCustomer = async (customerId) => { try { const response = await apiClient.get(`/customers/${customerId}`); return response.data; } catch (error) { handleApiError(error, 'showCustomer'); }};
const updateCustomer = async (customerId, customerData) => { try { const response = await apiClient.put(`/customers/${customerId}`, customerData); return response.data; } catch (error) { handleApiError(error, 'updateCustomer'); }};
const listDomains = async (params = {}) => { try { const response = await apiClient.get('/domains', { params }); return response.data; } catch (error) { handleApiError(error, 'listDomains'); }};
const registerDomain = async (domainData) => { try { const response = await apiClient.post('/domains', domainData); return response.data; } catch (error) { handleApiError(error, 'registerDomain'); }};
const transferDomain = async (transferData) => { try { const response = await apiClient.post('/domains/transfer', transferData); return response.data; } catch (error) { handleApiError(error, 'transferDomain'); }};
const showDomainById = async (domainId) => { try { const response = await apiClient.get(`/domains/${domainId}`); return response.data; } catch (error) { handleApiError(error, 'showDomainById'); }};
const resendVerificationEmail = async (domainId) => { try { const response = await apiClient.post(`/domains/${domainId}/verification/resend`); return response.data; } catch (error) { handleApiError(error, 'resendVerificationEmail'); }};
const lockDomain = async (domainId, reason = '') => { try { const response = await apiClient.put(`/domains/${domainId}/locked`, { reason }); return response.data; } catch (error) { handleApiError(error, 'lockDomain'); }};
const unlockDomain = async (domainId) => { try { const response = await apiClient.delete(`/domains/${domainId}/locked`); return response.data; } catch (error) { handleApiError(error, 'unlockDomain'); }};
const suspendDomain = async (domainId, reason, type = 2) => { try { const response = await apiClient.put(`/domains/${domainId}/suspended`, { type, reason }); return response.data; } catch (error) { handleApiError(error, 'suspendDomain'); }};
const unsuspendDomain = async (domainId) => { try { const response = await apiClient.delete(`/domains/${domainId}/suspended`); return response.data; } catch (error) { handleApiError(error, 'unsuspendDomain'); }};
const getDnsRecords = async (domainId) => { try { const response = await apiClient.get(`/domains/${domainId}/dns`); return response.data; } catch (error) { handleApiError(error, 'getDnsRecords'); }};
const createDnsRecord = async (domainId, recordData) => { try { const response = await apiClient.put(`/domains/${domainId}/dns`, recordData); return response.data; } catch (error) { handleApiError(error, 'createDnsRecord'); }};
const deleteDnsRecord = async (domainId, recordData) => { try { const response = await apiClient.delete(`/domains/${domainId}/dns/record`, { data: recordData }); return response.data; } catch (error) { handleApiError(error, 'deleteDnsRecord'); }};
const checkDomainAvailability = async (domain) => { try { const response = await apiClient.get('/domains/availability', { params: { domain } }); const result = response.data?.data?.[0]; if (!result) throw new Error('Invalid API response'); return { name: result.name, status: result.available === 1 ? 'available' : 'taken' }; } catch (error) { handleApiError(error, 'checkDomainAvailability'); }};

// **FUNGSI SSL YANG BENAR**
const listSslProductsWithPrices = async (params = {}) => { try { const response = await apiClient.get('/ssl/prices', { params }); return response.data; } catch (error) { handleApiError(error, 'listSslProductsWithPrices'); }};
const showSslProductWithPrice = async (productId) => { try { const response = await apiClient.get('/ssl/prices', { params: { id: productId, limit: 1 } }); return response.data.data[0]; } catch (error) { handleApiError(error, 'showSslProductWithPrice'); }};
const generateCsr = async (csrData) => { try { const response = await apiClient.post('/ssl/csr/generate', new URLSearchParams(csrData)); return response.data; } catch (error) { handleApiError(error, 'generateCsr'); }};
const orderSsl = async (orderData) => { try { const response = await apiClient.post('/ssl/orders', new URLSearchParams(orderData)); return response.data; } catch (error) { handleApiError(error, 'orderSsl'); }};

module.exports = {
    createCustomer, showCustomer, updateCustomer, listDomains, registerDomain, checkDomainAvailability,
    transferDomain, showDomainById, resendVerificationEmail, lockDomain, unlockDomain,
    suspendDomain, unsuspendDomain, getDnsRecords, createDnsRecord, deleteDnsRecord,
    // **EKSPOR FUNGSI SSL YANG BENAR**
    listSslProductsWithPrices,
    showSslProductWithPrice,
    generateCsr,
    orderSsl
};