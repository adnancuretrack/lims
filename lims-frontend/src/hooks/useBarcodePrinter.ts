import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';

export interface PrintOptions {
    width?: string;
    height?: string;
}

export function useBarcodePrinter(options: PrintOptions = { width: '2in', height: '1in' }) {
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        pageStyle: `
            @page {
                size: ${options.width} ${options.height};
                margin: 0;
            }
            @media print {
                body {
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    -webkit-print-color-adjust: exact;
                }
            }
        `
    });

    return { componentRef, handlePrint };
}
