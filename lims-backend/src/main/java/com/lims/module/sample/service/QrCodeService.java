package com.lims.module.sample.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class QrCodeService {

    private static final int DEFAULT_WIDTH = 250;
    private static final int DEFAULT_HEIGHT = 250;

    /**
     * Generates a QR code image as PNG bytes for the given text/URL.
     *
     * @param text The text or URL to encode
     * @return Byte array of the PNG image
     */
    public byte[] generateQrCodePng(String text) {
        return generateQrCodePng(text, DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }

    /**
     * Generates a QR code image as PNG bytes with custom width and height.
     *
     * @param text   The text or URL to encode
     * @param width  Width in pixels
     * @param height Height in pixels
     * @return Byte array of the PNG image
     */
    public byte[] generateQrCodePng(String text, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 1); // Compact border

            BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height, hints);

            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            return pngOutputStream.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate QR code for text: {}", text, e);
            throw new RuntimeException("Could not generate QR code", e);
        }
    }
}
