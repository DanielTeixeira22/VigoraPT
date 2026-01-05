"use strict";
/**
 * Cloudinary Configuration & Upload Service
 *
 * Provides cloud-based file storage for production environments.
 * Falls back to local storage in development.
 *
 * @module services/cloudinary
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCloudinaryAvailable = exports.deleteFromCloudinary = exports.uploadFileToCloudinary = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
// ============================================================================
// Configuration
// ============================================================================
/**
 * Initialize Cloudinary with environment variables.
 * Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
const isCloudinaryConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET);
if (isCloudinaryConfigured) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('☁️  Cloudinary configurado com sucesso');
}
else {
    console.log('⚠️  Cloudinary não configurado - uploads serão guardados localmente');
}
// ============================================================================
// Upload Functions
// ============================================================================
/**
 * Uploads a file buffer to Cloudinary.
 *
 * @param buffer - File buffer to upload
 * @param options - Upload options
 * @returns Promise with upload result
 */
const uploadToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: options.folder || 'vigorapt',
            resource_type: options.resource_type || 'auto',
            ...(options.public_id ? { public_id: options.public_id } : {}),
        };
        cloudinary_1.v2.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error || !result) {
                reject(error || new Error('Upload failed'));
                return;
            }
            resolve({
                public_id: result.public_id,
                secure_url: result.secure_url,
                url: result.url,
                format: result.format,
                bytes: result.bytes,
                width: result.width,
                height: result.height,
            });
        }).end(buffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
/**
 * Uploads a file from a local path to Cloudinary.
 *
 * @param filepath - Local file path
 * @param options - Upload options
 * @returns Promise with upload result
 */
const uploadFileToCloudinary = async (filepath, options = {}) => {
    const result = await cloudinary_1.v2.uploader.upload(filepath, {
        folder: options.folder || 'vigorapt',
        resource_type: options.resource_type || 'auto',
    });
    return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
    };
};
exports.uploadFileToCloudinary = uploadFileToCloudinary;
/**
 * Deletes a file from Cloudinary.
 *
 * @param publicId - The public ID of the file to delete
 * @param resourceType - Type of resource
 * @returns Promise with deletion result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    return cloudinary_1.v2.uploader.destroy(publicId, { resource_type: resourceType });
};
exports.deleteFromCloudinary = deleteFromCloudinary;
/**
 * Checks if Cloudinary is configured and available.
 */
const isCloudinaryAvailable = () => isCloudinaryConfigured;
exports.isCloudinaryAvailable = isCloudinaryAvailable;
exports.default = cloudinary_1.v2;
