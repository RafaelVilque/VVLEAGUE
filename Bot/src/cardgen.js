import { createCanvas, loadImage } from '@napi-rs/canvas';

// ── VVL palette ──────────────────────────────────────────────────
const C = {
    bg:           '#0d0f1a',
    panelLoser:   '#111827',
    panelWinner:  '#0a1520',
    borderWinner: '#5BADFF',
    borderLoser:  '#1e2235',
    accent:       '#5BADFF',
    white:        '#ffffff',
    dimScore:     '#242d45',
    dimLabel:     '#303a55',
    subText:      '#6b7a99',
    separator:    '#1a2035',
};

const W = 1200, H = 480;

// ── Helpers ──────────────────────────────────────────────────────
async function fetchImage(url) {
    if (!url) return null;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        return loadImage(Buffer.from(await res.arrayBuffer()));
    } catch {
        return null;
    }
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
}

/** Draw a square logo with rounded corners, or a coloured placeholder. */
function drawSquareLogo(ctx, img, x, y, size, fallbackInitial) {
    ctx.save();
    roundRect(ctx, x, y, size, size, 10);
    ctx.clip();
    if (img) {
        ctx.drawImage(img, x, y, size, size);
    } else {
        ctx.fillStyle = '#1e2a45';
        ctx.fill();
        ctx.fillStyle = C.accent;
        ctx.font = `bold ${Math.round(size * 0.45)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((fallbackInitial || '?').charAt(0).toUpperCase(), x + size / 2, y + size / 2);
    }
    ctx.restore();
}

/** Draw a circular avatar. */
function drawCircleAvatar(ctx, img, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    if (img) {
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    } else {
        ctx.fillStyle = '#1e2a45';
        ctx.fill();
    }
    ctx.restore();
}

/** Truncate text to fit within maxWidth. */
function truncate(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t + '…';
}

// ── Main export ──────────────────────────────────────────────────
/**
 * @param {object} opts
 * @param {'WAR'|'WAGER'} opts.label
 * @param {string}  opts.winnerName
 * @param {string}  opts.loserName
 * @param {number}  opts.winnerScore
 * @param {number}  opts.loserScore
 * @param {string?} opts.winnerImageUrl   guild logo or player avatar URL
 * @param {string?} opts.loserImageUrl
 * @param {boolean} opts.isCircle         true for player avatars (wager), false for guild logos (war)
 * @param {string?} opts.mvpName
 * @param {string?} opts.mvpAvatarUrl
 * @param {string?} opts.mvpHandle        @username shown below mvp name
 */
export async function buildResultCard({
    label = 'WAR',
    winnerName, loserName,
    winnerScore, loserScore,
    winnerImageUrl, loserImageUrl,
    isCircle = false,
    mvpName, mvpAvatarUrl, mvpHandle,
}) {
    const [winnerImg, loserImg, mvpImg] = await Promise.all([
        fetchImage(winnerImageUrl),
        fetchImage(loserImageUrl),
        fetchImage(mvpAvatarUrl),
    ]);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ── Background ───────────────────────────────────────────────
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // subtle vertical gradient overlay
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   'rgba(91,173,255,0.04)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1,   'rgba(0,0,0,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // ── Panel geometry (defined early for centering calculations) ─
    const panelY = 62, panelH = 258;
    const LOGO = 88;
    const LP = { x: 30, w: 440 };
    const WP = { x: 640, w: 530 };
    const midX = (LP.x + LP.w + WP.x) / 2; // true midpoint between the two panels = 555

    // ── Top label ────────────────────────────────────────────────
    ctx.fillStyle = C.accent;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelSpaced = label.split('').join('  ');
    ctx.fillText(labelSpaced, midX, 30);

    // accent dots on each side of label
    const lw = ctx.measureText(labelSpaced).width;
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(midX - lw / 2 - 20, 29, 8, 2);
    ctx.fillRect(midX + lw / 2 + 12, 29, 8, 2);
    ctx.globalAlpha = 1;

    // thin divider
    ctx.strokeStyle = C.separator;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, 48); ctx.lineTo(W - 30, 48); ctx.stroke();

    // — Loser panel —
    ctx.fillStyle = C.panelLoser;
    roundRect(ctx, LP.x, panelY, LP.w, panelH, 14);
    ctx.fill();
    ctx.strokeStyle = C.borderLoser;
    ctx.lineWidth = 1;
    roundRect(ctx, LP.x, panelY, LP.w, panelH, 14);
    ctx.stroke();

    // loser image (left side of panel)
    const lImgX = LP.x + 28, lImgY = panelY + (panelH - LOGO) / 2 - 12;
    if (isCircle) drawCircleAvatar(ctx, loserImg, lImgX + LOGO / 2, lImgY + LOGO / 2, LOGO / 2);
    else          drawSquareLogo(ctx, loserImg, lImgX, lImgY, LOGO, loserName);

    // loser name
    ctx.fillStyle = C.white;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(truncate(ctx, loserName, 130), lImgX + LOGO / 2, lImgY + LOGO + 10);

    // loser score (right)
    ctx.fillStyle = C.dimScore;
    ctx.font = `bold 86px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const loserScoreText = `-${loserScore}`;
    ctx.fillText(loserScoreText, LP.x + LP.w - 28, panelY + panelH / 2 - 8);
    // "ELO" label beside score
    const loserScoreW = ctx.measureText(loserScoreText).width;
    ctx.fillStyle = C.dimLabel;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('ELO', LP.x + LP.w - 28 - loserScoreW - 8, panelY + panelH / 2 - 30);

    ctx.fillStyle = C.dimLabel;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('D E F E A T', LP.x + LP.w - 28, panelY + panelH / 2 + 48);

    // — VS — (centered between panels at midX)
    ctx.fillStyle = C.subText;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('vs', midX, panelY + panelH / 2);

    // — Winner panel —
    ctx.fillStyle = C.panelWinner;
    roundRect(ctx, WP.x, panelY, WP.w, panelH, 14);
    ctx.fill();
    ctx.strokeStyle = C.borderWinner;
    ctx.lineWidth = 2;
    roundRect(ctx, WP.x, panelY, WP.w, panelH, 14);
    ctx.stroke();

    // winner score (left side)
    ctx.fillStyle = C.white;
    ctx.font = `bold 96px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const winnerScoreText = String(winnerScore);
    ctx.fillText(winnerScoreText, WP.x + 38, panelY + panelH / 2 - 8);
    // "+ELO" label beside score
    const winnerScoreW = ctx.measureText(winnerScoreText).width;
    ctx.fillStyle = C.accent;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('+ELO', WP.x + 38 + winnerScoreW + 8, panelY + panelH / 2 - 30);

    ctx.fillStyle = C.accent;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('W I N N E R', WP.x + 38, panelY + panelH / 2 + 50);

    // winner image (right side)
    const wImgX = WP.x + WP.w - LOGO - 40, wImgY = panelY + (panelH - LOGO) / 2 - 12;
    if (isCircle) drawCircleAvatar(ctx, winnerImg, wImgX + LOGO / 2, wImgY + LOGO / 2, LOGO / 2);
    else          drawSquareLogo(ctx, winnerImg, wImgX, wImgY, LOGO, winnerName);

    ctx.fillStyle = C.white;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(truncate(ctx, winnerName, 130), wImgX + LOGO / 2, wImgY + LOGO + 10);

    // ── Footer ───────────────────────────────────────────────────
    const footerY = 340;
    ctx.strokeStyle = C.separator;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, footerY); ctx.lineTo(W - 30, footerY); ctx.stroke();

    // Match result (left)
    ctx.fillStyle = C.subText;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('M A T C H   R E S U L T', 50, footerY + 22);

    ctx.fillStyle = C.accent;
    ctx.font = `bold 26px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(`${winnerName} WINS`, 50, footerY + 42);

    ctx.fillStyle = C.subText;
    ctx.font = '14px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`${loserScore}  –  ${winnerScore}`, 50, footerY + 76);

    // MVP section (right, if provided)
    if (mvpName) {
        ctx.strokeStyle = C.separator;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W / 2, footerY + 15); ctx.lineTo(W / 2, H - 22); ctx.stroke();

        const mvpBaseX = W / 2 + 30;
        ctx.fillStyle = C.subText;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('M V P', mvpBaseX, footerY + 22);

        const avatarR = 30, avatarCX = mvpBaseX + avatarR + 5, avatarCY = footerY + 70;
        drawCircleAvatar(ctx, mvpImg, avatarCX, avatarCY, avatarR);

        const textX = avatarCX + avatarR + 16;
        ctx.fillStyle = C.white;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(mvpName, textX, avatarCY - 9);

        if (mvpHandle) {
            ctx.fillStyle = C.subText;
            ctx.font = '13px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText(`@${mvpHandle}`, textX, avatarCY + 12);
        }
    }

    return canvas.toBuffer('image/png');
}
