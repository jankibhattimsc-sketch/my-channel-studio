import { projectState } from '../utils/projectState.js';
import { copyToClipboard } from '../utils/clipboard.js';

export async function renderProjectPackage(container, navigateTo) {
  const p = projectState.getProject();

  container.innerHTML = `
    <!-- Top Header -->
    <div class="view-header" style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 2rem;">💾</span>
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0; background: linear-gradient(135deg, #10b981, #059669); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              ફાઇલ સેવ અને શેર સેન્ટર (Save & Share Package)
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 2px 0 0 0;">
              તમારા વિડીયોની સ્ક્રિપ્ટ, ઓડિયો, સ્લાઇડ્સ, SEO અને થંબનેલ એક જ પેકેજમાં સેવ અને શેર કરો.
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="btn-save-project-local" class="btn btn-success" style="font-weight: 800;">
            <span>💾</span> પ્રોજેક્ટ સેવ કરો
          </button>
        </div>
      </div>
    </div>

    <!-- Active Project Overview Card -->
    <div class="card" style="margin-bottom: 24px; border-left: 4px solid #10b981; background: rgba(16,185,129,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 16px;">
        <div>
          <span class="badge badge-green" style="font-size: 0.72rem; margin-bottom: 6px;">સક્રિય પ્રોજેક્ટ (Active Project)</span>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: #fff; margin: 0;">
            ${p.topic || 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026'}
          </h3>
          <span style="font-size: 0.78rem; color: var(--text-muted);">
            છેલ્લો ફેરફાર: ${new Date(p.updatedAt).toLocaleString('gu-IN')}
          </span>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="btn-share-mobile" class="btn btn-primary" style="background: linear-gradient(135deg, #25D366, #128C7E); border-color: #128C7E; font-weight: 800; box-shadow: 0 4px 14px rgba(37,211,102,0.35);">
            <span>📱</span> WhatsApp પર શેર કરો
          </button>
          <button id="btn-copy-all-package" class="btn btn-secondary">
            <span>📋</span> બધું કોપી કરો
          </button>
        </div>
      </div>

      <!-- 5-Asset Status Checklist Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; padding-top: 14px; border-top: 1px solid var(--border-color);">
        <!-- 1. Script -->
        <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; font-size: 0.85rem; color: #fff;">📝 સ્ક્રિપ્ટ</span>
            <span style="color: #10b981; font-weight: 800; font-size: 0.8rem;">✓ તૈયાર</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            ${p.script?.sections?.length || 4} વિભાગો • ${p.script?.durationMinutes || 10} મિનિટ
          </span>
        </div>

        <!-- 2. Audio -->
        <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; font-size: 0.85rem; color: #fff;">🎙️ વોઇસ ઓડિયો</span>
            <span style="color: #ec4899; font-weight: 800; font-size: 0.8rem;">✓ તૈયાર</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted); word-break: break-all;">
            ${p.voiceAudio?.filename || 'my_real_cloned_voice.mp3'}
          </span>
        </div>

        <!-- 3. Slides -->
        <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; font-size: 0.85rem; color: #fff;">🎬 સ્લાઇડ્સ</span>
            <span style="color: #38bdf8; font-weight: 800; font-size: 0.8rem;">✓ તૈયાર</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            ${p.slides?.length || 4} સ્લાઇડ્સ (16:9 HD)
          </span>
        </div>

        <!-- 4. SEO -->
        <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; font-size: 0.85rem; color: #fff;">🚀 YouTube SEO</span>
            <span style="color: #f59e0b; font-weight: 800; font-size: 0.8rem;">✓ તૈયાર</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            Title + Desc + Tags
          </span>
        </div>

        <!-- 5. Thumbnail -->
        <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; font-size: 0.85rem; color: #fff;">🎨 થંબનેલ</span>
            <span style="color: #a855f7; font-weight: 800; font-size: 0.8rem;">✓ તૈયાર</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            ૧ ફોટો + ૪ બોલ્ડ શબ્દો
          </span>
        </div>
      </div>
    </div>

    <!-- Direct Android APK Download Banner -->
    <div class="card" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(56, 189, 248, 0.12)); border: 1px solid rgba(16, 185, 129, 0.4); padding: 18px 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
            📱
          </div>
          <div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #ffffff;">
              જ્ઞાન યાત્રા Android APK ફાઇલ તૈયાર છે!
            </div>
            <div style="font-size: 0.82rem; color: #94a3b8; margin-top: 3px;">
              ફાઇલ નામ: <code style="color: #38bdf8; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">gyan_yatra_studio.apk</code> (48.5 MB) • તમારા મોબાઇલ પર 1-ક્લિકમાં ઇન્સ્ટોલ કરો
            </div>
          </div>
        </div>
        <a href="/gyan_yatra_studio.apk" download="gyan_yatra_studio.apk" class="btn btn-success" style="font-weight: 800; padding: 12px 22px; font-size: 0.95rem; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.45);">
          <span>📥</span> APK ફાઇલ ડાઉનલોડ કરો
        </a>
      </div>
    </div>

    <!-- Download & Export Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-bottom: 30px;">
      
      <!-- Card 1: Export Complete Package File -->
      <div class="card" style="padding: 20px;">
        <div style="font-size: 1.8rem; margin-bottom: 10px;">📦</div>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 6px;">
          આખું પ્રોજેક્ટ પેકેજ ફાઇલ (.TXT)
        </h4>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
          સ્ક્રિપ્ટ, સ્લાઇડ્સ, ટાઇટલ, ડિસ્ક્રિપ્શન, ટેગ્સ અને થંબનેલ પ્રોમ્પ્ટ બધું એક જ ફાઈલમાં સેવ કરો.
        </p>
        <button id="btn-download-package-txt" class="btn btn-primary" style="width: 100%; font-weight: 700;">
          <span>📥</span> ડાઉનલોડ પેકેજ ફાઇલ
        </button>
      </div>

      <!-- Card 2: Download Audio File -->
      <div class="card" style="padding: 20px;">
        <div style="font-size: 1.8rem; margin-bottom: 10px;">🎵</div>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 6px;">
          ઓડિયો નેરેશન ફાઇલ (MP3)
        </h4>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
          તમારા અસલી અવાજમાં બનેલી ઓડિયો ફાઇલ સીધી તમારા ફોન કે કમ્પ્યુટરમાં ડાઉનલોડ કરો.
        </p>
        <a id="btn-download-audio-direct" href="${p.voiceAudio?.audioUrl || '/audio/my_real_cloned_voice.mp3'}" download="${p.voiceAudio?.filename || 'video_narration.mp3'}" class="btn btn-success" style="width: 100%; font-weight: 700; text-align: center; display: block; text-decoration: none;">
          <span>📥</span> Download Audio MP3
        </a>
      </div>

      <!-- Card 3: Quick YouTube Ready Copy -->
      <div class="card" style="padding: 20px;">
        <div style="font-size: 1.8rem; margin-bottom: 10px;">🚀</div>
        <h4 style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 6px;">
          YouTube અપલોડ તૈયાર લખાણ
        </h4>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
          YouTube Studio માં વિડીયો અપલોડ કરતી વખતે સીધું પેસ્ટ કરી શકાય તેવું લખાણ.
        </p>
        <button id="btn-copy-youtube-pack" class="btn btn-outline" style="width: 100%; font-weight: 700;">
          <span>📋</span> Title + Desc + Tags કોપી
        </button>
      </div>
    </div>

    <!-- Complete Project Text Preview Area -->
    <div class="card">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div class="card-title" style="font-size: 1.05rem; font-weight: 700;">
          <span>📄</span> પેકેજ ફાઇલ પ્રિવ્યૂ (Complete Package Preview)
        </div>
        <button id="btn-copy-preview-box" class="btn btn-secondary btn-sm">
          <span>📋</span> લખાણ કોપી કરો
        </button>
      </div>

      <textarea id="package-preview-textarea" class="form-textarea font-gu" style="height: 320px; font-size: 0.86rem; line-height: 1.6; background: #07090e; color: #f1f5f9; padding: 16px; border-radius: 8px; width: 100%; resize: vertical;" readonly></textarea>
    </div>
  `;

  // Elements
  const previewTextarea = container.querySelector('#package-preview-textarea');
  const exportText = projectState.generateCompleteExportText();
  previewTextarea.value = exportText;

  // Local Save
  container.querySelector('#btn-save-project-local').addEventListener('click', () => {
    projectState.save();
    alert('પ્રોજેક્ટ સફળતાપૂર્વક સેવ થઈ ગયો!');
  });

  // Download Package TXT
  container.querySelector('#btn-download-package-txt').addEventListener('click', () => {
    const filename = `${p.topic.slice(0, 25).replace(/\s+/g, '_')}_package.txt`;
    if (window.StudioBridge && window.StudioBridge.postMessage) {
      try {
        window.StudioBridge.postMessage(JSON.stringify({
          action: 'download_text',
          filename: filename,
          content: exportText
        }));
      } catch (_) {}
    }
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  });

  // Copy Preview
  container.querySelector('#btn-copy-preview-box').addEventListener('click', () => {
    copyToClipboard(exportText, 'સંપૂર્ણ પેકેજ લખાણ કોપી થઈ ગયું!');
  });

  // Copy All
  container.querySelector('#btn-copy-all-package').addEventListener('click', () => {
    copyToClipboard(exportText, 'આખું વિડીયો પેકેજ કોપી થઈ ગયું!');
  });

  // Copy YouTube Pack (Title, Desc, Tags)
  container.querySelector('#btn-copy-youtube-pack').addEventListener('click', () => {
    const ytPack = `=== TITLE ===\n${p.seo.title}\n\n=== DESCRIPTION ===\n${p.seo.description}\n\n=== TAGS ===\n${p.seo.tags}`;
    copyToClipboard(ytPack, 'YouTube Title + Description + Tags કોપી થઈ ગયા!');
  });

  // Mobile Web Share / WhatsApp Share
  container.querySelector('#btn-share-mobile').addEventListener('click', async () => {
    const shareText = `🎯 *${p.topic}*\n\n📝 *Title:*\n${p.seo.title}\n\n🚀 *Tags:*\n${p.seo.tags}\n\n🎙️ *Audio:* ${window.location.origin}${p.voiceAudio?.audioUrl || ''}\n\n(Gyan Yatra Creator Studio)`;

    if (window.StudioBridge && window.StudioBridge.postMessage) {
      try {
        window.StudioBridge.postMessage(JSON.stringify({ action: 'share', text: shareText }));
        return;
      } catch (_) {}
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: p.topic,
          text: shareText
        });
      } catch (err) {
        // Fallback to WhatsApp Web
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      // WhatsApp direct
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  });
}
