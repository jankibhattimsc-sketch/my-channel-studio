import { projectState, STEP_METADATA } from '../utils/projectState.js';
import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { openFolderNotebookModal } from '../utils/folderNotebookModal.js';

export function renderProjects(container, navigateTo) {
  let searchQuery = '';
  let activeFolderId = projectState.getActiveFolderId() || 'f_all';

  function getFilteredProjects() {
    const list = projectState.getProjects();
    return list.filter(p => {
      const matchSearch = !searchQuery || 
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.folderName && p.folderName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.topic && p.topic.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchFolder = activeFolderId === 'f_all' || p.folderId === activeFolderId;
      return matchSearch && matchFolder;
    });
  }

  function render() {
    const projects = getFilteredProjects();
    const activeId = projectState.getActiveProjectId();
    const allProjects = projectState.getProjects();
    const allProjectsCount = allProjects.length;
    const folders = projectState.getFolders();

    container.innerHTML = `
      <!-- Top Hero Header -->
      <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 22px 24px; margin-bottom: 22px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
              <span style="font-size: 2.2rem; background: rgba(56,189,248,0.15); padding: 6px 12px; border-radius: 12px; border: 1px solid rgba(56,189,248,0.3);">📁</span>
              <div>
                <h1 style="font-size: 1.65rem; font-weight: 900; margin: 0; color: #ffffff; letter-spacing: -0.5px;">
                  વિડીયો ફોલ્ડર્સ મેનેજર (My Video Folders)
                </h1>
                <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 3px 0 0 0;">
                  તમારી ઇચ્છા મુજબ ફોલ્ડર બનાવો, નામ બદલો (Rename) અને <strong>Script, PPT, Voice તથા Thumbnail</strong> એક જ જગ્યાએ સેવ કરો.
                </p>
              </div>
            </div>
          </div>

          <!-- Top Action Buttons -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button id="btn-open-new-folder-modal" class="btn btn-outline" style="font-weight: 800; border-color: #38bdf8; color: #38bdf8; padding: 10px 18px; display: inline-flex; align-items: center; gap: 6px;">
              <span style="font-size: 1.1rem;">📁➕</span> નવું ફોલ્ડર બનાવો (New Folder)
            </button>
            <button id="btn-create-new-project-top" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-size: 0.95rem; font-weight: 800; padding: 10px 20px; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.45); display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">✨</span> નવો વિડીયો બનાવો (New Project)
            </button>
            <button id="btn-top-open-folder-notebook" class="btn btn-outline" style="font-weight: 800; border-color: #8b5cf6; color: #c4b5fd; padding: 10px 18px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
              <span style="font-size: 1.1rem;">📝</span> ફોલ્ડર નોટબુક (તારીખ-સમય સાથે)
            </button>
            <button id="btn-open-backup-modal" class="btn btn-outline btn-sm" style="font-weight: 700; border-color: rgba(255,255,255,0.2);">
              <span>💾</span> બેકઅપ
            </button>
          </div>
        </div>

        <!-- Custom Folders Filter Pills -->
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <span style="font-size: 0.8rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
              📁 મારી પસંદગીના ફોલ્ડર્સ (Custom Folders):
            </span>
            <span style="font-size: 0.78rem; color: #38bdf8;">
              💡 કોઈપણ ફોલ્ડરનું નામ બદલવા તેની પાસેનું <strong>✏️</strong> બટન દબાવો
            </span>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <!-- All Folders Pill -->
            <button class="btn btn-sm btn-folder-filter ${activeFolderId === 'f_all' ? 'btn-primary' : 'btn-outline'}" data-folder-id="f_all" style="font-size: 0.82rem; font-weight: 700; padding: 6px 14px; border-radius: 20px;">
              <span>📁</span> બધા ફોલ્ડર્સ (${allProjectsCount})
            </button>

            <!-- Custom Folders List -->
            ${folders.filter(f => f.id !== 'f_all').map(f => {
              const count = allProjects.filter(p => p.folderId === f.id).length;
              const isSelected = activeFolderId === f.id;
              return `
                <div class="folder-pill-container" style="display: inline-flex; align-items: center; background: ${isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)'}; border: 1.5px solid ${isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)'}; border-radius: 20px; padding: 2px 4px 2px 12px; gap: 6px;">
                  <span class="btn-folder-filter" data-folder-id="${f.id}" style="cursor: pointer; font-size: 0.82rem; font-weight: 700; color: ${isSelected ? '#ffffff' : '#cbd5e1'};">
                    ${f.name} <span class="badge font-en" style="padding: 2px 6px; font-size: 0.7rem; background: rgba(0,0,0,0.3);">${count}</span>
                  </span>
                  <button class="btn-rename-folder-pill" data-folder-id="${f.id}" title="આ ફોલ્ડરનું નામ બદલો (Rename Folder)" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 4px; font-size: 0.75rem; border-radius: 50%;">
                    ✏️
                  </button>
                  ${f.id !== 'f_default' ? `
                    <button class="btn-delete-folder-pill" data-folder-id="${f.id}" title="આ ફોલ્ડર કાઢી નાખો" style="background: transparent; border: none; color: #f87171; cursor: pointer; padding: 4px; font-size: 0.75rem; border-radius: 50%;">
                      ✕
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}

            <button id="btn-quick-add-folder-pill" class="btn btn-outline btn-sm" style="font-size: 0.8rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; border-style: dashed; border-color: #38bdf8; color: #7dd3fc;">
              ➕ નવું ફોલ્ડર
            </button>
          </div>
        </div>

        <!-- Search Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 260px;">
            <span style="color: var(--text-muted); font-size: 1.1rem;">🔍</span>
            <input type="text" id="input-search-projects" class="form-input" placeholder="ફોલ્ડર અથવા વિડીયો શોધો (Search by name or topic)..." value="${searchQuery}" style="font-size: 0.88rem; padding: 8px 12px;">
          </div>
        </div>
      </div>

      <!-- Projects / Folders Content Grid -->
      ${projects.length === 0 ? `
        <div class="card" style="text-align: center; padding: 50px 20px; border: 2px dashed rgba(255,255,255,0.15);">
          <span style="font-size: 3.5rem; margin-bottom: 12px; display: block;">📂</span>
          <h3 style="color: #fff; font-size: 1.25rem; margin-bottom: 8px;">આ ફોલ્ડરમાં હજી કોઈ વિડીયો નથી</h3>
          <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 18px;">
            નવો વિડીયો બનાવી આ ફોલ્ડરમાં સ્ક્રિપ્ટ, PPT, અવાજ અને થંબનેલ સેવ કરવા નીચેનું બટન દબાવો.
          </p>
          <button id="btn-create-first-project" class="btn btn-success" style="font-weight: 800; padding: 10px 22px;">
            ✨ નવો વિડીયો પ્રોજેક્ટ શરૂ કરો
          </button>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px;">
          ${projects.map(p => {
            const isActive = p.id === activeId;
            const progress = projectState.getProjectProgress(p);
            const lastStepKey = p.lastStep || 'topics';
            const stepMeta = STEP_METADATA[lastStepKey] || STEP_METADATA['topics'];
            
            // Core 4 Files details
            const scriptName = p.script?.customName || `${(p.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_')}_script.txt`;
            const hasScript = Boolean(p.script?.fullText || (p.script?.sections && p.script.sections.length > 0));
            const scriptExcerpt = p.script?.fullText 
              ? p.script.fullText.substring(0, 70) + '...'
              : (p.script?.sections && p.script.sections[0]?.content ? p.script.sections[0].content.substring(0, 70) + '...' : '');

            const pptName = p.slide?.customName || `${(p.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_')}_slides.pptx`;
            const slidesCount = (p.slide?.slides && p.slide.slides.length) || 0;

            const voiceName = p.voice?.customName || p.voice?.filename || `${(p.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_')}_voice.wav`;
            const hasVoice = Boolean(p.voice?.audioUrl || p.voice?.hasSavedAudio);
            const voiceDuration = p.voice?.duration || 0;

            const thumbName = p.thumbnail?.customName || `${(p.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_')}_thumbnail.png`;
            const hasThumb = Boolean(p.thumbnail?.gujaratiWords || p.thumbnail?.dalleShortPrompt);
            const thumbWords = p.thumbnail?.gujaratiWords || '';

            return `
              <div class="card project-folder-card" style="border: 1.5px solid ${isActive ? '#10b981' : 'rgba(255,255,255,0.1)'}; background: ${isActive ? 'linear-gradient(145deg, rgba(16,185,129,0.06), rgba(15,23,42,0.95))' : 'rgba(15, 23, 42, 0.85)'}; border-radius: 14px; padding: 20px; box-shadow: ${isActive ? '0 8px 26px rgba(16,185,129,0.22)' : 'none'};">
                
                <!-- Folder Card Top Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                  
                  <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <!-- Folder Tag Pill -->
                    <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.8rem; font-weight: 800; display: inline-flex; align-items: center; gap: 5px;">
                      <span>📁</span> ${p.folderName || 'મુખ્ય ફોલ્ડર'}
                    </span>

                    <button class="btn btn-outline btn-xs btn-move-project-folder" data-id="${p.id}" title="આ વિડીયો બીજા ફોલ્ડરમાં ખસેડો" style="font-size: 0.72rem; padding: 3px 8px; border-color: rgba(255,255,255,0.2);">
                      📁 ફોલ્ડર બદલો
                    </button>

                    ${isActive ? `
                      <span class="badge badge-green" style="font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; gap: 5px;">
                        <span class="status-dot" style="background: #10b981; box-shadow: 0 0 8px #10b981;"></span> ચાલુ પ્રોજેક્ટ (Active)
                      </span>
                    ` : ''}
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">
                      🕒 છેલ્લે સેવ: ${new Date(p.updatedAt).toLocaleDateString('gu-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button class="btn btn-outline btn-sm btn-rename-project" data-id="${p.id}" title="આ પ્રોજેક્ટનું નામ બદલો (Rename)" style="padding: 5px 10px; font-size: 0.78rem; font-weight: 700;">
                      ✏️ Rename
                    </button>
                    <button class="btn btn-outline btn-sm btn-delete-project" data-id="${p.id}" title="ડિલીટ કરો" style="padding: 5px 10px; font-size: 0.78rem; color: #f87171; border-color: rgba(248,113,113,0.3);">
                      🗑️
                    </button>
                  </div>
                </div>

                <!-- Video Title -->
                <div style="margin-bottom: 16px;">
                  <h3 style="font-size: 1.25rem; font-weight: 900; color: #ffffff; margin: 0 0 6px 0; line-height: 1.35;">
                    ${p.name}
                  </h3>
                  <div style="display: flex; align-items: center; gap: 12px; font-size: 0.78rem; color: var(--text-secondary); flex-wrap: wrap;">
                    <span>પ્રગતિ: <strong style="color: ${progress >= 75 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#94a3b8'};">${progress}% પૂર્ણ</strong></span>
                    <span>•</span>
                    <span style="color: #38bdf8;">છેલ્લું ટૂલ: ${stepMeta.icon} ${stepMeta.nameGuj}</span>
                    <span>•</span>
                    <span style="color: #34d399; font-weight: 700;">💡 ${(p.ideas && p.ideas.length) || (p.idea?.topic ? 1 : 0)} આઈડિયા સેવ છે</span>
                  </div>
                </div>

                <!-- THE 4 CORE ASSET FILES BOX: Script, PPT, Voice, Thumbnail -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 18px;">
                  
                  <!-- 1. Script File Box -->
                  <div style="background: rgba(0, 0, 0, 0.35); border: 1.5px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 800; font-size: 0.85rem; color: #34d399; display: flex; align-items: center; gap: 5px;">
                          <span>📝</span> સ્ક્રિપ્ટ (Script)
                        </span>
                        <button class="btn-rename-file" data-id="${p.id}" data-file="script" title="આ સ્ક્રિપ્ટ ફાઇલ Rename કરો" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #94a3b8; font-size: 0.7rem; padding: 2px 6px; cursor: pointer;">
                          ✏️ Rename
                        </button>
                      </div>

                      <div style="font-size: 0.75rem; font-family: monospace; color: #6ee7b7; background: rgba(16,185,129,0.1); padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; word-break: break-all;">
                        📄 ${scriptName}
                      </div>

                      <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 8px; line-height: 1.35;">
                        ${hasScript ? `✓ લખાણ તૈયાર: "${scriptExcerpt}"` : '⚪ સ્ક્રિપ્ટ હજી ખાલી છે'}
                      </div>
                    </div>

                    <div style="display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
                      <button class="btn btn-outline btn-xs btn-open-tool" data-id="${p.id}" data-tool="scriptwriter" style="flex: 1; font-weight: 700; border-color: #10b981; color: #34d399;">
                        ✍️ એડિટ
                      </button>
                      <button class="btn btn-outline btn-xs btn-download-file" data-id="${p.id}" data-file="script" title="સ્ક્રિપ્ટ .txt ડાઉનલોડ કરો" style="padding: 4px 8px;">
                        📥 ડાઉનલોડ
                      </button>
                    </div>
                  </div>

                  <!-- 2. PPT / Slides File Box -->
                  <div style="background: rgba(0, 0, 0, 0.35); border: 1.5px solid rgba(139, 92, 246, 0.3); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 800; font-size: 0.85rem; color: #c4b5fd; display: flex; align-items: center; gap: 5px;">
                          <span>📑</span> સ્લાઇડ્સ & PPT
                        </span>
                        <button class="btn-rename-file" data-id="${p.id}" data-file="slide" title="આ PPT ફાઇલ Rename કરો" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #94a3b8; font-size: 0.7rem; padding: 2px 6px; cursor: pointer;">
                          ✏️ Rename
                        </button>
                      </div>

                      <div style="font-size: 0.75rem; font-family: monospace; color: #c4b5fd; background: rgba(139,92,246,0.1); padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; word-break: break-all;">
                        📊 ${pptName}
                      </div>

                      <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${slidesCount > 0 ? `✓ ${slidesCount} સ્લાઇડ્સ ઉપલબ્ધ (૧૬:૯ HD)` : '⚪ સ્લાઇડ્સ હજી ખાલી છે'}
                      </div>
                    </div>

                    <div style="display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
                      <button class="btn btn-outline btn-xs btn-open-tool" data-id="${p.id}" data-tool="slideprompts" style="flex: 1; font-weight: 700; border-color: #8b5cf6; color: #c4b5fd;">
                        📑 એડિટ
                      </button>
                      <button class="btn btn-outline btn-xs btn-download-file" data-id="${p.id}" data-file="slide" title="સ્લાઇડ્સ ડાઉનલોડ કરો" style="padding: 4px 8px;">
                        📥 ડાઉનલોડ
                      </button>
                    </div>
                  </div>

                  <!-- 3. Voice Audio File Box -->
                  <div style="background: rgba(0, 0, 0, 0.35); border: 1.5px solid rgba(236, 72, 153, 0.3); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 800; font-size: 0.85rem; color: #f472b6; display: flex; align-items: center; gap: 5px;">
                          <span>🎙️</span> અવાજ (Voice)
                        </span>
                        <button class="btn-rename-file" data-id="${p.id}" data-file="voice" title="આ ઓડિયો ફાઇલ Rename કરો" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #94a3b8; font-size: 0.7rem; padding: 2px 6px; cursor: pointer;">
                          ✏️ Rename
                        </button>
                      </div>

                      <div style="font-size: 0.75rem; font-family: monospace; color: #f472b6; background: rgba(236,72,153,0.1); padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; word-break: break-all;">
                        🎵 ${voiceName}
                      </div>

                      <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${hasVoice ? `✓ ઓડિયો રેકોર્ડ થયેલ (${voiceDuration}s)` : '⚪ અવાજ હજી રેકોર્ડ થયો નથી'}
                      </div>

                      ${p.voice?.audioUrl ? `
                        <audio controls src="${p.voice.audioUrl}" style="width: 100%; height: 28px; margin-bottom: 6px;"></audio>
                      ` : ''}
                    </div>

                    <div style="display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
                      <button class="btn btn-outline btn-xs btn-open-tool" data-id="${p.id}" data-tool="myvoice" style="flex: 1; font-weight: 700; border-color: #ec4899; color: #f472b6;">
                        🎙️ રેકોર્ડ / ઓપન
                      </button>
                      <button class="btn btn-outline btn-xs btn-download-file" data-id="${p.id}" data-file="voice" title="ઓડિયો ફાઇલ ડાઉનલોડ કરો" style="padding: 4px 8px;">
                        📥 ડાઉનલોડ
                      </button>
                    </div>
                  </div>

                  <!-- 4. Thumbnail File Box -->
                  <div style="background: rgba(0, 0, 0, 0.35); border: 1.5px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 800; font-size: 0.85rem; color: #fbbf24; display: flex; align-items: center; gap: 5px;">
                          <span>🖼️</span> થંબનેલ (Thumbnail)
                        </span>
                        <button class="btn-rename-file" data-id="${p.id}" data-file="thumbnail" title="આ થંબનેલ ફાઇલ Rename કરો" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #94a3b8; font-size: 0.7rem; padding: 2px 6px; cursor: pointer;">
                          ✏️ Rename
                        </button>
                      </div>

                      <div style="font-size: 0.75rem; font-family: monospace; color: #fde68a; background: rgba(245,158,11,0.1); padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; word-break: break-all;">
                        🎨 ${thumbName}
                      </div>

                      <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${hasThumb ? `✓ શબ્દો: "${thumbWords || '૧૬:૯ પ્લાન તૈયાર'}"` : '⚪ થંબનેલ પ્લાન ખાલી છે'}
                      </div>
                    </div>

                    <div style="display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
                      <button class="btn btn-outline btn-xs btn-open-tool" data-id="${p.id}" data-tool="canva" style="flex: 1; font-weight: 700; border-color: #f59e0b; color: #fbbf24;">
                        🎨 કેન્વા / SEO
                      </button>
                      <button class="btn btn-outline btn-xs btn-download-file" data-id="${p.id}" data-file="thumbnail" title="થંબનેલ પ્લાન ડાઉનલોડ કરો" style="padding: 4px 8px;">
                        📥 ડાઉનલોડ
                      </button>
                    </div>
                  </div>

                </div>

                <!-- Bottom Folder Actions Strip -->
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);">
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-primary btn-sm btn-resume-project" data-id="${p.id}" data-step="${lastStepKey}" style="font-weight: 800; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 9px 18px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                      <span>🎬</span> આ વિડીયો વર્કસ્પેસ ખોલો (Open Workspace)
                    </button>
                    <button class="btn btn-outline btn-sm btn-open-tool" data-id="${p.id}" data-tool="videoeditor" style="font-weight: 800; border-color: #38bdf8; color: #38bdf8; background: rgba(56,189,248,0.1); padding: 8px 16px; display: flex; align-items: center; gap: 6px;">
                      <span>🎥</span> ૫. વિડીયો એડિટર (1080p Video)
                    </button>
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-outline btn-sm btn-download-folder-bundle" data-id="${p.id}" style="font-weight: 800; border-color: #38bdf8; color: #38bdf8; padding: 7px 14px; display: flex; align-items: center; gap: 5px;">
                      <span>📦</span> આખું ફોલ્ડર ડાઉનલોડ કરો (Download All)
                    </button>
                    <button class="btn btn-outline btn-sm btn-duplicate-project" data-id="${p.id}" title="ડુપ્લિકેટ કોપી બનાવો" style="padding: 7px 12px; font-size: 0.8rem;">
                      📑 કોપી
                    </button>
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      `}

      <!-- Create New Custom Folder Modal -->
      <div id="modal-create-folder" class="custom-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 99999; align-items: center; justify-content: center; padding: 20px;">
        <div class="card" style="width: 100%; max-width: 460px; background: #0f172a; border: 1.5px solid #38bdf8; box-shadow: 0 20px 50px rgba(0,0,0,0.8); border-radius: 14px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>📁➕</span> નવું ફોલ્ડર બનાવો (Create Folder)
            </h3>
            <button id="btn-close-folder-modal" class="btn btn-outline btn-sm" style="border: none; font-size: 1.2rem; padding: 2px 8px; color: var(--text-muted);">✕</button>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 700; font-size: 0.88rem; color: #e2e8f0; margin-bottom: 6px;">
              તમારી ઇચ્છા મુજબ ફોલ્ડરનું નામ આપો:
            </label>
            <input type="text" id="input-new-folder-name" class="form-input font-gu" placeholder="દા.ત. આંગણવાડી ભરતી ૨૦૨૬, વિધવા સહાય યોજના..." style="font-size: 0.95rem; padding: 10px 14px; width: 100%;">
          </div>

          <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 0.82rem; color: #bae6fd;">
            💡 આ ફોલ્ડરમાં તમે તમારા વિડીયોની <strong>સ્ક્રિપ્ટ, PPT, અવાજ અને થંબનેલ</strong> એક સાથે રાખી શકશો અને ગમે ત્યારે Rename કરી શકશો.
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="btn-cancel-folder-modal" class="btn btn-secondary">રદ કરો</button>
            <button id="btn-submit-folder-modal" class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7, #0369a1); font-weight: 800; padding: 10px 20px;">
              ✨ ફોલ્ડર બનાવો
            </button>
          </div>
        </div>
      </div>

      <!-- Create New Project Modal -->
      <div id="modal-create-project" class="custom-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 99999; align-items: center; justify-content: center; padding: 20px;">
        <div class="card" style="width: 100%; max-width: 500px; background: #0f172a; border: 1.5px solid rgba(56,189,248,0.4); box-shadow: 0 20px 50px rgba(0,0,0,0.8); border-radius: 14px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 1.3rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>✨</span> નવો વિડીયો બનાવો (New Project)
            </h3>
            <button id="btn-close-create-modal" class="btn btn-outline btn-sm" style="border: none; font-size: 1.2rem; padding: 2px 8px; color: var(--text-muted);">✕</button>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 700; font-size: 0.88rem; color: #e2e8f0; margin-bottom: 6px;">
              વિડીયોનું નામ / મુખ્ય વિષય:
            </label>
            <input type="text" id="input-new-project-name" class="form-input font-gu" placeholder="દા.ત. આંગણવાડી સુપરવાઈઝર ભરતી 2026: સત્તાવાર જાહેરાત..." style="font-size: 0.95rem; padding: 10px 14px; width: 100%;">
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 700; font-size: 0.88rem; color: #e2e8f0; margin-bottom: 6px;">
              આ વિડીયો કયા ફોલ્ડરમાં સેવ કરવો છે?
            </label>
            <select id="select-new-project-folder" class="form-select font-gu" style="font-size: 0.9rem; padding: 9px 12px; width: 100%;">
              ${folders.filter(f => f.id !== 'f_all').map(f => `
                <option value="${f.id}" ${f.id === activeFolderId ? 'selected' : ''}>
                  📁 ${f.name}
                </option>
              `).join('')}
            </select>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="btn-cancel-create-modal" class="btn btn-secondary">રદ કરો</button>
            <button id="btn-submit-create-modal" class="btn btn-success" style="font-weight: 800; padding: 10px 22px;">
              ✨ વિડીયો શરૂ કરો
            </button>
          </div>
        </div>
      </div>

      <!-- Universal Rename Modal (For Folders & Files) -->
      <div id="modal-universal-rename" class="custom-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 99999; align-items: center; justify-content: center; padding: 20px;">
        <div class="card" style="width: 100%; max-width: 460px; background: #0f172a; border: 1.5px solid #10b981; box-shadow: 0 20px 50px rgba(0,0,0,0.8); border-radius: 14px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 id="modal-rename-title" style="margin: 0; font-size: 1.25rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>✏️</span> નામ બદલો (Rename)
            </h3>
            <button id="btn-close-rename-modal" class="btn btn-outline btn-sm" style="border: none; font-size: 1.2rem; padding: 2px 8px; color: var(--text-muted);">✕</button>
          </div>

          <div style="margin-bottom: 18px;">
            <label id="modal-rename-label" style="display: block; font-weight: 700; font-size: 0.88rem; color: #e2e8f0; margin-bottom: 6px;">
              નવું નામ આપો:
            </label>
            <input type="text" id="input-universal-rename-value" class="form-input font-gu" style="font-size: 0.95rem; padding: 10px 14px; width: 100%;">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="btn-cancel-rename-modal" class="btn btn-secondary">રદ કરો</button>
            <button id="btn-submit-rename-modal" class="btn btn-success" style="font-weight: 800; padding: 10px 20px;">
              💾 સાચવો (Save)
            </button>
          </div>
        </div>
      </div>

      <!-- Move Project to Folder Modal -->
      <div id="modal-move-folder" class="custom-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 99999; align-items: center; justify-content: center; padding: 20px;">
        <div class="card" style="width: 100%; max-width: 440px; background: #0f172a; border: 1.5px solid #38bdf8; box-shadow: 0 20px 50px rgba(0,0,0,0.8); border-radius: 14px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 1.2rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>📁</span> ફોલ્ડરમાં ખસેડો (Move to Folder)
            </h3>
            <button id="btn-close-move-modal" class="btn btn-outline btn-sm" style="border: none; font-size: 1.2rem; padding: 2px 8px; color: var(--text-muted);">✕</button>
          </div>

          <div style="margin-bottom: 18px;">
            <label style="display: block; font-weight: 700; font-size: 0.88rem; color: #e2e8f0; margin-bottom: 6px;">
              કયા ફોલ્ડરમાં ખસેડવું છે તે પસંદ કરો:
            </label>
            <select id="select-target-move-folder" class="form-select font-gu" style="font-size: 0.9rem; padding: 10px 12px; width: 100%;">
              ${folders.filter(f => f.id !== 'f_all').map(f => `
                <option value="${f.id}">📁 ${f.name}</option>
              `).join('')}
            </select>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="btn-cancel-move-modal" class="btn btn-secondary">રદ કરો</button>
            <button id="btn-submit-move-modal" class="btn btn-primary" style="font-weight: 800; padding: 10px 20px;">
              ✓ ખસેડો (Move)
            </button>
          </div>
        </div>
      </div>

      <!-- Backup & Restore Modal -->
      <div id="modal-backup" class="custom-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 99999; align-items: center; justify-content: center; padding: 20px;">
        <div class="card" style="width: 100%; max-width: 500px; background: #0f172a; border: 1.5px solid rgba(255,255,255,0.15); box-shadow: 0 20px 50px rgba(0,0,0,0.8); border-radius: 14px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>💾</span> ડેટા બેકઅપ અને રીસ્ટોર
            </h3>
            <button id="btn-close-backup-modal" class="btn btn-outline btn-sm" style="border: none; font-size: 1.2rem; padding: 2px 8px; color: var(--text-muted);">✕</button>
          </div>

          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 18px;">
            તમારા બધા ફોલ્ડર્સ અને પ્રોજેક્ટ્સનો બેકઅપ ફાઈલ તરીકે ડાઉનલોડ કરો અથવા રીસ્ટોર કરો.
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button id="btn-download-backup" class="btn btn-primary" style="font-weight: 800; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>📥</span> તમામ પ્રોજેક્ટ્સ ડાઉનલોડ કરો (Export JSON)
            </button>
            <label class="btn btn-outline" style="font-weight: 700; padding: 12px; text-align: center; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>📤</span> બેકઅપ ફાઈલ અપલોડ કરો (Import JSON)
              <input type="file" id="input-import-backup-file" accept=".json" style="display: none;">
            </label>
          </div>
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // Search input
    const searchInput = container.querySelector('#input-search-projects');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
        const inputRefocus = container.querySelector('#input-search-projects');
        if (inputRefocus) {
          inputRefocus.focus();
          inputRefocus.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    // Folder filter tabs
    container.querySelectorAll('.btn-folder-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFolderId = btn.getAttribute('data-folder-id');
        projectState.setActiveFolderId(activeFolderId);
        render();
      });
    });

    // Create New Folder Modal
    const folderModal = container.querySelector('#modal-create-folder');
    const openFolderModal = () => {
      if (folderModal) {
        folderModal.style.display = 'flex';
        const inp = container.querySelector('#input-new-folder-name');
        if (inp) {
          inp.value = '';
          inp.focus();
        }
      }
    };
    container.querySelector('#btn-open-new-folder-modal')?.addEventListener('click', openFolderModal);
    container.querySelector('#btn-quick-add-folder-pill')?.addEventListener('click', openFolderModal);

    const closeFolderModal = () => {
      if (folderModal) folderModal.style.display = 'none';
    };
    container.querySelector('#btn-close-folder-modal')?.addEventListener('click', closeFolderModal);
    container.querySelector('#btn-cancel-folder-modal')?.addEventListener('click', closeFolderModal);

    container.querySelector('#btn-submit-folder-modal')?.addEventListener('click', () => {
      const inp = container.querySelector('#input-new-folder-name');
      const name = inp ? inp.value.trim() : '';
      if (!name) {
        alert('મહેરબાની કરીને ફોલ્ડરનું નામ દાખલ કરો!');
        inp?.focus();
        return;
      }
      const created = projectState.createFolder(name);
      if (created) {
        activeFolderId = created.id;
        closeFolderModal();
        render();
        showNoticeToast(`🎉 નવું ફોલ્ડર "${name}" સફળતાપૂર્વક બની ગયું! ✓`, 'success');
      }
    });

    container.querySelector('#input-new-folder-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        container.querySelector('#btn-submit-folder-modal')?.click();
      }
    });

    // Rename Folder Pill
    container.querySelectorAll('.btn-rename-folder-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fId = btn.getAttribute('data-folder-id');
        const folder = projectState.getFolders().find(f => f.id === fId);
        if (!folder) return;

        const newName = prompt(`"${folder.name}" ફોલ્ડરનું નવું નામ આપો:`, folder.name);
        if (newName && newName.trim()) {
          projectState.renameFolder(fId, newName.trim());
          render();
          showNoticeToast(`✓ ફોલ્ડરનું નામ બદલીને "${newName.trim()}" થયું!`, 'success');
        }
      });
    });

    // Delete Folder Pill
    container.querySelectorAll('.btn-delete-folder-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fId = btn.getAttribute('data-folder-id');
        const folder = projectState.getFolders().find(f => f.id === fId);
        if (!folder) return;

        if (confirm(`શું તમે ખરેખર "${folder.name}" ફોલ્ડર ડિલીટ કરવા માંગો છો?\nઆ ફોલ્ડરના તમામ વિડીયો મુખ્ય ફોલ્ડરમાં ખસેડવામાં આવશે.`)) {
          projectState.deleteFolder(fId);
          activeFolderId = 'f_all';
          render();
          showNoticeToast('ફોલ્ડર ડિલીટ થયું અને વિડીયો સાચવવામાં આવ્યા.', 'warning');
        }
      });
    });

    // Top Open Folder Notebook
    container.querySelector('#btn-top-open-folder-notebook')?.addEventListener('click', () => {
      const curFId = activeFolderId !== 'f_all' ? activeFolderId : 'f_default';
      const curF = projectState.getFolders().find(f => f.id === curFId) || { id: 'f_default', name: '📁 મુખ્ય ફોલ્ડર' };
      openFolderNotebookModal({ folderId: curF.id, folderName: curF.name });
    });

    // Create New Project Modal
    const createModal = container.querySelector('#modal-create-project');
    const openCreateModal = () => {
      if (createModal) {
        createModal.style.display = 'flex';
        const inp = container.querySelector('#input-new-project-name');
        if (inp) {
          inp.value = '';
          inp.focus();
        }
      }
    };
    container.querySelector('#btn-create-new-project-top')?.addEventListener('click', openCreateModal);
    container.querySelector('#btn-create-first-project')?.addEventListener('click', openCreateModal);

    const closeCreateModal = () => {
      if (createModal) createModal.style.display = 'none';
    };
    container.querySelector('#btn-close-create-modal')?.addEventListener('click', closeCreateModal);
    container.querySelector('#btn-cancel-create-modal')?.addEventListener('click', closeCreateModal);

    container.querySelector('#btn-submit-create-modal')?.addEventListener('click', () => {
      const nameInput = container.querySelector('#input-new-project-name');
      const folderSelect = container.querySelector('#select-new-project-folder');
      const name = nameInput ? nameInput.value.trim() : '';
      const fId = folderSelect ? folderSelect.value : (activeFolderId !== 'f_all' ? activeFolderId : 'f_default');

      if (!name) {
        alert('કૃપા કરીને વિડીયોનું નામ દાખલ કરો!');
        nameInput?.focus();
        return;
      }

      projectState.createProject(name, name, 'સરકારી યોજના', fId);
      closeCreateModal();
      navigateTo('workspace');
    });

    container.querySelector('#input-new-project-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        container.querySelector('#btn-submit-create-modal')?.click();
      }
    });

    // Universal Rename Modal Handlers
    const renameModal = container.querySelector('#modal-universal-rename');
    const renameTitleEl = container.querySelector('#modal-rename-title');
    const renameLabelEl = container.querySelector('#modal-rename-label');
    const renameInput = container.querySelector('#input-universal-rename-value');
    let currentRenameAction = null;

    const openUniversalRename = ({ title, label, initialValue, onSave }) => {
      if (renameModal && renameInput) {
        if (renameTitleEl) renameTitleEl.innerHTML = `<span>✏️</span> ${title}`;
        if (renameLabelEl) renameLabelEl.textContent = label;
        renameInput.value = initialValue;
        currentRenameAction = onSave;
        renameModal.style.display = 'flex';
        renameInput.focus();
        renameInput.select();
      }
    };

    const closeRenameModal = () => {
      if (renameModal) renameModal.style.display = 'none';
      currentRenameAction = null;
    };
    container.querySelector('#btn-close-rename-modal')?.addEventListener('click', closeRenameModal);
    container.querySelector('#btn-cancel-rename-modal')?.addEventListener('click', closeRenameModal);

    container.querySelector('#btn-submit-rename-modal')?.addEventListener('click', () => {
      const val = renameInput ? renameInput.value.trim() : '';
      if (!val) {
        alert('કૃપા કરીને નામ દાખલ કરો!');
        renameInput?.focus();
        return;
      }
      if (typeof currentRenameAction === 'function') {
        currentRenameAction(val);
      }
      closeRenameModal();
      render();
    });

    renameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        container.querySelector('#btn-submit-rename-modal')?.click();
      }
    });

    // Rename Project Button
    container.querySelectorAll('.btn-rename-project').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const proj = projectState.getProjects().find(p => p.id === id);
        if (!proj) return;

        openUniversalRename({
          title: 'વિડીયો / ફોલ્ડરનું નામ બદલો',
          label: 'નવું નામ આપો:',
          initialValue: proj.name,
          onSave: (newName) => {
            projectState.renameProject(id, newName);
            showNoticeToast(`✓ નામ બદલીને "${newName}" કરવામાં આવ્યું!`, 'success');
          }
        });
      });
    });

    // Rename Individual Asset Files (Script, PPT, Voice, Thumbnail)
    container.querySelectorAll('.btn-rename-file').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const fileType = btn.getAttribute('data-file');
        const proj = projectState.getProjects().find(p => p.id === id);
        if (!proj) return;

        const currentName = fileType === 'script' ? (proj.script?.customName || 'script.txt')
          : fileType === 'slide' ? (proj.slide?.customName || 'slides.pptx')
          : fileType === 'voice' ? (proj.voice?.customName || 'voice.wav')
          : (proj.thumbnail?.customName || 'thumbnail.png');

        const fileTypeName = fileType === 'script' ? 'સ્ક્રિપ્ટ (Script)'
          : fileType === 'slide' ? 'પીપીટી (PPT / Slides)'
          : fileType === 'voice' ? 'વોઇસ (Voice Audio)'
          : 'થંબનેલ (Thumbnail)';

        openUniversalRename({
          title: `${fileTypeName} ફાઇલ Rename કરો`,
          label: `આ ${fileTypeName} ફાઇલનું નવું નામ આપો:`,
          initialValue: currentName,
          onSave: (newName) => {
            projectState.renameFile(id, fileType, newName);
            showNoticeToast(`✓ ${fileTypeName} ફાઇલનું નામ બદલીને "${newName}" રાખ્યું!`, 'success');
          }
        });
      });
    });

    // Move Project to Folder Modal
    const moveModal = container.querySelector('#modal-move-folder');
    let moveTargetProjectId = null;

    container.querySelectorAll('.btn-move-project-folder').forEach(btn => {
      btn.addEventListener('click', () => {
        moveTargetProjectId = btn.getAttribute('data-id');
        const proj = projectState.getProjects().find(p => p.id === moveTargetProjectId);
        if (moveModal && proj) {
          const sel = container.querySelector('#select-target-move-folder');
          if (sel) sel.value = proj.folderId || 'f_default';
          moveModal.style.display = 'flex';
        }
      });
    });

    const closeMoveModal = () => {
      if (moveModal) moveModal.style.display = 'none';
      moveTargetProjectId = null;
    };
    container.querySelector('#btn-close-move-modal')?.addEventListener('click', closeMoveModal);
    container.querySelector('#btn-cancel-move-modal')?.addEventListener('click', closeMoveModal);

    container.querySelector('#btn-submit-move-modal')?.addEventListener('click', () => {
      const sel = container.querySelector('#select-target-move-folder');
      const targetFId = sel ? sel.value : 'f_default';
      if (moveTargetProjectId && targetFId) {
        projectState.moveProjectToFolder(moveTargetProjectId, targetFId);
        closeMoveModal();
        render();
        showNoticeToast('✓ વિડીયો પસંદ કરેલા ફોલ્ડરમાં સફળતાપૂર્વક ખસેડાયો!', 'success');
      }
    });

    // Open Tool Buttons (Script, Slides, Voice, Canva) inside Dedicated Workspace
    container.querySelectorAll('.btn-open-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const tool = btn.getAttribute('data-tool');
        if (id && tool) {
          projectState.setActiveProject(id);
          if (tool === 'videoeditor') {
            navigateTo('videoeditor');
            return;
          }
          const toolToSectionMap = {
            topics: 'ideas',
            slideprompts: 'slideprompt',
            slideeditor: 'slides',
            scriptwriter: 'script',
            myvoice: 'voice',
            editing: 'publishing',
            canva: 'thumbnail',
            seo: 'thumbnail',
            seodescription: 'seo'
          };
          projectState.setWorkspaceState(id, { activeSection: toolToSectionMap[tool] || tool });
          navigateTo('workspace');
        }
      });
    });

    // Resume Project Button (Opens Project-Centric Workspace at last active stage)
    container.querySelectorAll('.btn-resume-project').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          projectState.setActiveProject(id);
          navigateTo('workspace');
        }
      });
    });

    // Download Individual Asset Files
    container.querySelectorAll('.btn-download-file').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const fileType = btn.getAttribute('data-file');
        if (!id || !fileType) return;

        if (fileType === 'script') {
          projectState.downloadScriptFile(id);
          showNoticeToast('📥 સ્ક્રિપ્ટ ફાઇલ ડાઉનલોડ થઈ ગઈ છે! ✓', 'success');
        } else if (fileType === 'slide') {
          projectState.downloadPPTFile(id);
          showNoticeToast('📥 સ્લાઇડ્સ ફાઇલ ડાઉનલોડ થઈ ગઈ છે! ✓', 'success');
        } else if (fileType === 'voice') {
          const res = await projectState.downloadVoiceFile(id);
          if (res) showNoticeToast('📥 ઓડિયો ફાઇલ ડાઉનલોડ થઈ ગઈ છે! ✓', 'success');
        } else if (fileType === 'thumbnail') {
          projectState.downloadThumbnailFile(id);
          showNoticeToast('📥 થંબનેલ પ્લાન ડાઉનલોડ થઈ ગયો છે! ✓', 'success');
        }
      });
    });

    // Download Full Folder Bundle
    container.querySelectorAll('.btn-download-folder-bundle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          projectState.downloadCompleteFolderBundle(id);
          showNoticeToast('📦 સંપૂર્ણ ફોલ્ડર પેકેજ સફળતાપૂર્વક ડાઉનલોડ થયું! ✓', 'success');
        }
      });
    });

    // Duplicate Project Button
    container.querySelectorAll('.btn-duplicate-project').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        projectState.duplicateProject(id);
        render();
        showNoticeToast('✓ ડુપ્લિકેટ કોપી સફળતાપૂર્વક બની ગઈ!', 'success');
      });
    });

    // Delete Project Button
    container.querySelectorAll('.btn-delete-project').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const proj = projectState.getProjects().find(p => p.id === id);
        if (!proj) return;

        if (confirm(`શું તમે ખરેખર "${proj.name}" પ્રોજેક્ટ ડિલીટ કરવા માંગો છો?`)) {
          projectState.deleteProject(id);
          render();
          showNoticeToast('પ્રોજેક્ટ ડિલીટ કરવામાં આવ્યો.', 'warning');
        }
      });
    });

    // Backup & Restore Modal
    const backupModal = container.querySelector('#modal-backup');
    container.querySelector('#btn-open-backup-modal')?.addEventListener('click', () => {
      if (backupModal) backupModal.style.display = 'flex';
    });
    container.querySelector('#btn-close-backup-modal')?.addEventListener('click', () => {
      if (backupModal) backupModal.style.display = 'none';
    });

    // Download Backup
    container.querySelector('#btn-download-backup')?.addEventListener('click', () => {
      const json = projectState.exportAllProjectsJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gyan_yatra_projects_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNoticeToast('💾 બેકઅપ ફાઈલ ડાઉનલોડ થઈ ગઈ છે!', 'success');
    });

    // Import Backup File
    container.querySelector('#input-import-backup-file')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const res = projectState.importProjectsJSON(event.target.result);
        if (res.success) {
          alert(`સફળતાપૂર્વક ${res.count} પ્રોજેક્ટ્સ રીસ્ટોર થયા!`);
          if (backupModal) backupModal.style.display = 'none';
          render();
        } else {
          alert('ભૂલ: ' + res.error);
        }
      };
      reader.readAsText(file);
    });
  }

  // Initial render
  render();
}
