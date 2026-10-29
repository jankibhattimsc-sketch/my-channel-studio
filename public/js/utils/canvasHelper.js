// 16:9 YouTube Thumbnail Canvas Renderer (1280 x 720)
export class ThumbnailCanvasRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.width = 1280;
    this.height = 720;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Default State
    this.state = {
      preset: 'white_minimalist',
      backgroundImage: null,
      creatorImage: null,
      creatorPosition: 'left', // 'left', 'right'
      creatorScale: 1.0,
      topicText: 'ગુજરાત કર્મચારીઓ', // Element 1: Main Topic
      mainText: 'DA વધારો મંજૂર!',     // Element 2: Primary Hook
      subText: '૨૦૨૬ સત્તાવાર અપડેટ',   // Element 3: Supporting Detail
      badgeText: 'સત્તાવાર નિર્ણય ⚠️', // Element 4: Badge
      textColor: '#102A56',
      fontSize: 76,
      strokeColor: '#000000',
      strokeWidth: 4,
      accentColor: '#D71920'
    };
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  setBackgroundImage(imgElement) {
    this.state.backgroundImage = imgElement;
    this.render();
  }

  setCreatorImage(imgElement) {
    this.state.creatorImage = imgElement;
    this.render();
  }

  render() {
    const { ctx, width, height, state } = this;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Background
    if (state.backgroundImage) {
      ctx.drawImage(state.backgroundImage, 0, 0, width, height);
      // Dark vignette overlay for readability
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(0,0,0,0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      this.drawPresetBackground(state.preset);
    }

    // 2. Draw Creator Photo if uploaded
    if (state.creatorImage) {
      this.drawCreatorPhoto();
    }

    // 3. Draw Badge (e.g. "નવી જાહેરાત!")
    if (state.badgeText) {
      this.drawBadge(state.badgeText);
    }

    // 4. Draw High-Impact Gujarati Typography
    this.drawMainTypography();
  }

  drawPresetBackground(preset) {
    const { ctx, width, height } = this;
    if (preset === 'white_minimalist') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const grad = ctx.createLinearGradient(0, 0, width, height);

    switch (preset) {
      case 'breaking':
        grad.addColorStop(0, '#990000');
        grad.addColorStop(0.5, '#400000');
        grad.addColorStop(1, '#0a0d14');
        break;
      case 'finance':
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(0.6, '#022c22');
        grad.addColorStop(1, '#06101e');
        break;
      case 'tech':
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#0c4a6e');
        grad.addColorStop(1, '#020617');
        break;
      case 'curiosity':
      default:
        grad.addColorStop(0, '#581c87');
        grad.addColorStop(0.5, '#1e1b4b');
        grad.addColorStop(1, '#09090b');
        break;
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Add subtle grid texture / glow circles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < width; i += 60) {
      ctx.fillRect(i, 0, 1, height);
    }
  }

  drawCreatorPhoto() {
    const { ctx, width, height, state } = this;
    const img = state.creatorImage;
    if (!img) return;

    ctx.save();
    const targetHeight = height * 0.95 * state.creatorScale;
    const aspect = img.width / img.height;
    const targetWidth = targetHeight * aspect;

    let posX = state.creatorPosition === 'left' ? 40 : (width - targetWidth - 40);
    let posY = height - targetHeight;

    // Drop shadow on creator cutout
    ctx.shadowColor = state.preset === 'white_minimalist' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = state.preset === 'white_minimalist' ? 16 : 30;
    ctx.shadowOffsetX = state.creatorPosition === 'left' ? 15 : -15;

    ctx.drawImage(img, posX, posY, targetWidth, targetHeight);
    ctx.restore();
  }

  drawBadge(badgeText) {
    const { ctx, width, state } = this;
    ctx.save();

    const isLeft = state.creatorPosition === 'right';
    const posX = isLeft ? 60 : (width - 450);
    const posY = 60;

    ctx.font = 'bold 34px "Noto Sans Gujarati", sans-serif';
    const textMetrics = ctx.measureText(badgeText);
    const bgWidth = textMetrics.width + 44;
    const bgHeight = 58;

    // Pill background
    const isWhite = state.preset === 'white_minimalist';
    ctx.fillStyle = isWhite ? '#102A56' : (state.accentColor || '#FF0000');
    ctx.beginPath();
    ctx.roundRect(posX, posY, bgWidth, bgHeight, 10);
    ctx.fill();

    // Border
    if (!isWhite) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, posX + 22, posY + (bgHeight / 2));

    ctx.restore();
  }

  drawMainTypography() {
    const { ctx, width, height, state } = this;
    ctx.save();

    const isLeft = state.creatorPosition === 'right';
    const startX = isLeft ? 60 : (width / 2) + 20;
    const isWhite = state.preset === 'white_minimalist';

    if (isWhite) {
      // 1. Element 1: Main Topic in Deep Navy Blue (#102A56)
      let curY = 145;
      if (state.topicText) {
        ctx.font = '900 48px "Noto Sans Gujarati", "Outfit", sans-serif';
        ctx.fillStyle = '#102A56';
        ctx.textBaseline = 'top';
        ctx.fillText(state.topicText, startX, curY);
        curY += 65;
      }

      // 2. Element 2: Primary Hook in Crimson Red (#D71920) panel with Gold Yellow (#FFD928) Text
      if (state.mainText) {
        ctx.font = `900 ${state.fontSize || 74}px "Noto Sans Gujarati", "Outfit", sans-serif`;
        const metrics = ctx.measureText(state.mainText);
        const paddingH = 24;
        const boxW = Math.min(metrics.width + (paddingH * 2), width - startX - 40);
        const boxH = (state.fontSize || 74) + 26;

        // Crimson Red Container
        ctx.fillStyle = '#D71920';
        ctx.beginPath();
        ctx.roundRect(startX - 8, curY, boxW, boxH, 12);
        ctx.fill();

        // Gold Yellow Text
        ctx.fillStyle = '#FFD928';
        ctx.textBaseline = 'top';
        ctx.fillText(state.mainText, startX + paddingH - 8, curY + 12);
        curY += boxH + 24;
      }

      // 3. Element 3: Supporting Detail in Dark Charcoal (#111111)
      if (state.subText) {
        ctx.font = 'bold 42px "Noto Sans Gujarati", sans-serif';
        ctx.fillStyle = '#111111';
        ctx.textBaseline = 'top';
        ctx.fillText(state.subText, startX, curY);
      }

      ctx.restore();
      return;
    }

    // Default / Legacy Dark Contrast Rendering
    const startY = 220;
    ctx.font = `900 ${state.fontSize}px "Noto Sans Gujarati", "Outfit", sans-serif`;
    ctx.textBaseline = 'top';

    const words = state.mainText.split(' ');
    let line1 = state.mainText;
    let line2 = '';

    if (words.length > 3) {
      const mid = Math.ceil(words.length / 2);
      line1 = words.slice(0, mid).join(' ');
      line2 = words.slice(mid).join(' ');
    }

    const drawLine = (text, y, bgColor = 'rgba(0,0,0,0.85)', textColor = '#FFDD00') => {
      if (!text) return;
      const metrics = ctx.measureText(text);
      const padding = 20;
      const boxW = metrics.width + (padding * 2);
      const boxH = state.fontSize + 24;

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(startX - padding, y, boxW, boxH, 14);
      ctx.fill();

      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;

      ctx.lineWidth = state.strokeWidth;
      ctx.strokeStyle = state.strokeColor;
      ctx.strokeText(text, startX, y + 10);

      ctx.fillStyle = textColor;
      ctx.fillText(text, startX, y + 10);
    };

    drawLine(line1, startY, 'rgba(0,0,0,0.85)', '#FFE600');
    if (line2) {
      drawLine(line2, startY + state.fontSize + 32, '#FF0000', '#FFFFFF');
    }

    if (state.subText) {
      ctx.font = 'bold 44px "Noto Sans Gujarati", sans-serif';
      const subY = startY + (line2 ? (state.fontSize * 2 + 70) : (state.fontSize + 45));
      drawLine(state.subText, subY, 'rgba(16, 185, 129, 0.9)', '#FFFFFF');
    }

    ctx.restore();
  }

  download(filename = 'youtube-thumbnail-1280x720.png') {
    const dataUrl = this.canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
