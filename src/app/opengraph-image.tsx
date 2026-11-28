import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Clarriva: run your school with clarity';

/** The picture shown when the site is shared in chats and social posts. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', height: '100%', background: '#0D2B55', color: '#FFFFFF', padding: 80 }}>
        <div style={{ display: 'flex', fontSize: 84, fontWeight: 700 }}>Clarriva</div>
        <div style={{ display: 'flex', fontSize: 48, marginTop: 24 }}>Run your school with clarity</div>
        <div style={{ display: 'flex', fontSize: 28, marginTop: 36, opacity: 0.75 }}>Records, results, fees and CBT exams for Nigerian secondary schools</div>
      </div>
    ),
    size,
  );
}
