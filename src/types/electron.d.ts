// Tipos do Electron para o renderer process
declare namespace Electron {
  interface PrinterInfo {
    name: string;
    displayName?: string;
    description?: string;
    status: number;
    isDefault?: boolean;
    options?: any;
  }
}
