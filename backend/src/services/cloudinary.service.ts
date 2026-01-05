/**
 * Cloudinary Configuration & Upload Service
 * 
 * Provides cloud-based file storage for production environments.
 * Falls back to local storage in development.
 * 
 * @module services/cloudinary
 */

import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Initialize Cloudinary with environment variables.
 * Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
const isCloudinaryConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('☁️  Cloudinary configurado com sucesso');
} else {
    console.log('⚠️  Cloudinary não configurado - uploads serão guardados localmente');
}

// ============================================================================
// Types
// ============================================================================

export interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    url: string;
    format: string;
    bytes: number;
    width?: number;
    height?: number;
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
export const uploadToCloudinary = (
    buffer: Buffer,
    options: {
        folder?: string;
        resource_type?: 'image' | 'video' | 'raw' | 'auto';
        public_id?: string;
    } = {}
): Promise<CloudinaryUploadResult> => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: options.folder || 'vigorapt',
            resource_type: options.resource_type || 'auto',
            ...(options.public_id ? { public_id: options.public_id } : {}),
        };

        cloudinary.uploader.upload_stream(
            uploadOptions,
            (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
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
            }
        ).end(buffer);
    });
};

/**
 * Uploads a file from a local path to Cloudinary.
 * 
 * @param filepath - Local file path
 * @param options - Upload options
 * @returns Promise with upload result
 */
export const uploadFileToCloudinary = async (
    filepath: string,
    options: {
        folder?: string;
        resource_type?: 'image' | 'video' | 'raw' | 'auto';
    } = {}
): Promise<CloudinaryUploadResult> => {
    const result = await cloudinary.uploader.upload(filepath, {
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

/**
 * Deletes a file from Cloudinary.
 * 
 * @param publicId - The public ID of the file to delete
 * @param resourceType - Type of resource
 * @returns Promise with deletion result
 */
export const deleteFromCloudinary = async (
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<{ result: string }> => {
    return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

/**
 * Checks if Cloudinary is configured and available.
 */
export const isCloudinaryAvailable = (): boolean => isCloudinaryConfigured;

export default cloudinary;
