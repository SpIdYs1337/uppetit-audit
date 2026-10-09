'use client';

import { QRCodeSVG } from 'qrcode.react';
import { buildTotpEnrollmentUri, type TotpEnrollment } from '@/lib/totpEnrollment';

export function MfaEnrollmentQr(enrollment: TotpEnrollment) {
  return <div className="flex justify-center">
    <QRCodeSVG
      value={buildTotpEnrollmentUri(enrollment)}
      size={280}
      marginSize={4}
      level="M"
      bgColor="#FFFFFF"
      fgColor="#000000"
      title="QR-код для подключения аутентификатора"
      role="img"
      className="h-auto w-full max-w-[280px] rounded-xl"
    />
  </div>;
}
