import { projectState, STEP_METADATA } from '../utils/projectState.js';
import { copyToClipboard } from '../utils/clipboard.js';

export function renderProjects(container, navigateTo) {
  let searchQuery = '';
  let activeCategory = 'all';

  function getFilteredProjects() {
    const list = projectState.getProjects();
    return list.filter(p => {
      const matchSearch = !searchQuery || 
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.topic && p.topic.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = activeCategory === 'all' || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }

  function render() {
    const projects = getFilteredProjects();
    const activeId = projectState.getActiveProjectId();
    const allProjectsCount = projectState.getProjects().length;

    container.innerHTML = `
      <!-- Top Hero Header -->
      <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 22px 24px; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
              <span style="font-size: 2rem;">📁</span>
              <div>
                <h1 style="font-size: 1.6rem; font-weight: 900; margin: 0; color: #ffffff; letter-spacing: -0.5px;">
                  વિડીયો પ્રોજેક્ટ્સ મેનેજર (My Video Projects)
                </h1>
                <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 3px 0 0 0;">
                  તમારા દરેક વિડીયોના આઈડિયા, સ્ક્રિપ્ટ, સ્લાઈડ્સ, ઓડિયો, એડિટિંગ, કેન્વા અને SEO અલગ અલગ નામ સાથે સેવ કરો.
                </p>
              </div>
            </div>
          </div>

          <!-- Top Action Buttons -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button id="btn-open-backup-modal" class="btn btn-outline btn-sm" style="font-weight: 700; border-color: rgba(255,255,255,0.2);">
              <span>💾</span> બેકઅપ / રિસ્ટોર
            </button>
            <button id="btn-create-new-project-top" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-size: 0.95rem; font-weight: 800; padding: 10px 20px; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.45); display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">➕</span> નવો પ્રોજેક્ટ (New Project)
            </button>
          </div>
        </div>

        <!-- Search & Filter Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 260px;">
            <span style="color: var(--text-muted); font-size: 1.1rem;">🔍</span>
            <input type="text" id="input-search-projects" class="form-input" placeholder="પ્રોજેક્ટ શોધો (Search by name or topic)..." value="${searchQuery}" style="font-size: 0.88rem; padding: 8px 12px;">
          </div>

          <!-- Category Badges -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${[
              { id: 'all', label: `બધા (${allProjectsCount})` },
              { id: 'સરકારી યોજના', label: '🏛️ સરકારી યોજના' },
              { id: 'સરકારી ભરતી', label: '📋 ભરતી & પરિપત્ર' },
              { id: 'સામાન્ય જ્ઞાન', label: '💡 જ્ઞાન & ઇતિહાસ' },
              { id: 'સમાચાર', label: '📰 બ્રેકિંગ ન્યૂઝ' }
            ].map(cat => `
              <button class="btn btn-sm btn-category-filter ${activeCategory === cat.id ? 'btn-primary' : 'btn-outline'}" data-cat="${cat.id}" style="font-size: 0.78rem; padding: 4px 10px;">
                ${cat.label}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Projects Grid -->
      ${projects.length === 0 ? `
        <div class="card" style="text-align: center; padding: 50px 20px; border: 2px dashed rgba(255,255,255,0.15);">
          <span style="font-size: 3rem; margin-bottom: 12px; display: block;">📂</span>
          <h3 style="color: #fff; font-size: 1.2rem; margin-bottom: 8px;">કોઈ પ્રોજેક્ટ મળ્યો નથી</h3>
          <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 18px;">
            નવો વિડીયો પ્રોજેક્ટ શરૂ કરવા માટે નીચેનું બટન દબાવો.
          </p>
          <button id="btn-create-first-project" class="btn btn-success" style="font-weight: 800; padding: 10px 22px;">
            ➕ નવો પ્રોજેક્ટ બનાવો (Create Project)
          </button>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; margin-bottom: 30px;">
          ${projects.map(p => {
            const isActive = p.id === activeId;
            const progress = projectState.getProjectProgress(p);
            const lastStepKey = p.lastStep || 'topics';
            const stepMeta = STEP_METADATA[lastStepKey] || STEP_METADATA['topics'];
            const tools = [
              { id: 'topics', icon: '💡', name: 'આઈડિયા', ok: !!(p.idea?.topic && p.idea?.topic !== 'નવો વિડીયો વિષય') },
              { id: 'slideprompts', icon: '📑', name: 'સ્લાઇડ્સ', ok: !!(p.slide?.slides?.length > 1 || p.slide?.tool2Prompt) },
              { id: 'scriptwriter', icon: '📝', name: 'સ્ક્રિપ્ટ', ok: !!(p.script?.sections?.length > 1 || p.script?.fullText) },
              { id: 'myvoice', icon: '🎙️', name: 'અવાજ', ok: !!(p.voice?.audioUrl || p.voice?.hasSavedAudio) },
              { id: 'editing', icon: '🎬', name: 'એડિટિંગ', ok: !!(p.editing?.customNotes || Object.values(p.editing?.checklist || {}).some(v => v)) },
              { id: 'canva', icon: '🎨', name: 'કેન્વા', ok: !!(p.canva?.notes || p.canva?.headline) },
              { id: 'seodescription', icon: '🚀', name: 'SEO', ok: !!(p.seo?.title && p.seo?.description) },
              { id: 'seo', icon: '🖼️', name: 'થંબનેલ', ok: !!(p.thumbnail?.gujaratiWords || p.thumbnail?.dalleShortPrompt) }
            ];

            return `
              <div class="card project-card" style="border: 1.5px solid ${isActive ? '#10b981' : 'rgba(255,255,255,0.1)'}; background: ${isActive ? 'linear-gradient(145deg, rgba(16,185,129,0.06), rgba(15,23,42,0.95))' : 'rgba(15, 23, 42, 0.75)'}; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.25s ease; border-radius: 12px; padding: 18px; box-shadow: ${isActive ? '0 8px 24px rgba(16,185,129,0.2)' : 'none'};">
                
                <div>
                  <!-- Card Top Badge Row -->
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.72rem; font-weight: 700;">
                      ${p.category || 'સરકારી યોજના'}
                    </span>

                    ${isActive ? `
                      <span class="badge badge-green" style="font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; gap: 5px;">
                        <span class="status-dot" style="background: #10b981; box-shadow: 0 0 8px #10b981;"></span> ચાલુ પ્રોજેક્ટ (Active)
                      </span>
                    ` : `
                      <span style="font-size: 0.72rem; color: var(--text-muted);">
                        ${new Date(p.updatedAt).toLocaleDateString('gu-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    `}
                  </div>

                  <!-- Project Title -->
                  <h3 style="font-size: 1.15rem; font-weight: 800; color: #ffffff; margin: 0 0 8px 0; line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${p.name}
                  </h3>

                  <!-- Last Visited Step Badge (Resume Banner) -->
                  <div style="background: rgba(56, 189, 248, 0.08); border: 1px dashed rgba(56, 189, 248, 0.35); border-radius: 8px; padding: 6px 10px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 0.74rem; color: #94a3b8;">છેલ્લે તમે અહીં હતા:</span>
                    <span style="font-size: 0.78rem; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 5px;">
                      <span>${stepMeta.icon}</span> <span>${stepMeta.nameGuj}</span>
                    </span>
                  </div>

                  <!-- Progress Bar -->
                  <div style="margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">
                      <span>કામગીરી પ્રગતિ</span>
                      <strong style="color: ${progress >= 75 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#94a3b8'};">${progress}% પૂર્ણ</strong>
                    </div>
                    <div style="height: 6px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
                      <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, #10b981, #38bdf8); transition: width 0.3s ease;"></div>
                    </div>
                  </div>

                  <!-- 8 Tools Mini Chips (Clickable to jump directly) -->
                  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px;">
                    ${tools.map(t => `
                      <div class="btn-tool-chip" data-id="${p.id}" data-tool="${t.id}" style="background: ${t.ok ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${t.ok ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)'}; border-radius: 6px; padding: 5px 6px; text-align: center; font-size: 0.7rem; color: ${t.ok ? '#a7f3d0' : 'var(--text-muted)'}; cursor: pointer; transition: all 0.2s;" title="${t.name}: સીધું આ ટૂલ ખોલવા ટેપ કરો">
                        <span>${t.icon}</span> ${t.ok ? '✓' : '•'}
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Action Buttons: Resume & Workspace -->
                <div style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <button class="btn btn-primary btn-sm btn-resume-project" data-id="${p.id}" data-step="${lastStepKey}" style="flex: 1.2; font-weight: 800; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 9px 12px; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                    <span>▶️</span> જ્યાંથી અટક્યા ત્યાંથી ચાલુ કરો
                  </button>

                  <button class="btn btn-outline btn-sm btn-open-workspace" data-id="${p.id}" title="આખો પ્રોજેક્ટ ઓવરવ્યુ / વર્કસ્પેસ" style="padding: 8px 10px; font-size: 0.78rem; font-weight: 700; border-color: rgba(56,189,248,0.4); color: #7dd3fc;">
                    <span>🌐</span>
                  </button>

                  <div style="display: flex; gap: 4px;">
                    <button class="btn btn-outline btn-sm btn-rename-project" data-id="${p.id}" title="નામ બદલો" style="padding: 6px 10px; font-size: 0.78rem;">
                      ✏️
                    </button>
                    <button class="btn btn-outline btn-sm btn-duplicate-project" data-id="${p.id}" title="ડુપ્લિકેટ કોપી બનાવો" style="padding: 6px 10px; font-size: 0.78rem;">
                      📑
                    </button>
                    <button class="btn btn-outline btn-sm btn-delete-project" data-id="${p.id}" title="ડિલીટ કરો" style="padding: 6px 10px; font-size: 0.78rem; color: #f87171; border-color: rgba(248,113,113,0.3);">
                      🗑️
                    </button>
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      `}

      <!-- Create New Project Modal -->
      <div id="modal-create-project" class="custom-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(6px); z-index: 9999; align-items: center; justify-content: center; padding: 20px;">
        <div class="card" style="width: 100%; max-width: 520px; background: #0f172a; border: 1.5px solid rgba(56,189,248,0.4); box-shadow: 0 20px 50px rgba(0,0,0,0.7); border-radius: 14px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 1.3rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>➕</span> નવો વિડીયો પ્રોજેક્ટ બનાવો
            </h3>
            <button id="btn-close-create-modal" class="btn btn-outline btn-sm" style="border: none; font-size: 1.2rem; padding: 2px 8px; color: var(--text-muted);">✕</button>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 700; font-size: 0.88rem; color: #e2e8f0; margin-bottom: 6px;">
              પ્રોજેક્ટનું નામ / વિડીયોનો મુખ્ય વિષય:
            </label>
            <input type="text" id="input-new-project-name" class="form-input" placeholder="દા.ત. આંગણવાડી સુપરવાઈઝર ભરતી 2026: સત્તાવાર જાહેરાત..." style="font-size: 0.95rem; padding: 10px 14px;">
          </div>

          <div style="margin-bottom: 18px;">
            <label style="display: block; font-weight: 700; font-size: 0.88rem; color: #e2e8f0; margin-bottom: 6px;">
              કેટેગરી પસંદ કરો:
            </label>
            <select id="select-new-project-cat" class="form-select" style="font-size: 0.9rem; padding: 9px 12px;">
              <option value="સરકારી યોજના">🏛️ સરકારી યોજના (Govt Schemes)</option>
              <option value="સરકારી ભરતી">📋 સરકારી ભરતી & પરીક્ષા (Govt Jobs / Bharti)</option>
              <option value="સામાન્ય જ્ઞાન">💡 સામાન્ય જ્ઞાન & ઇતિહાસ (GK & History)</option>
              <option value="સમાચાર">📰 બ્રેકિંગ ન્યૂઝ & પરિપત્ર (Latest News)</option>
              <option value="અન્ય">🎯 અન્ય કેટેગરી (General Video)</option>
            </select>
          </div>

          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 0.82rem; color: #a7f3d0;">
            💡 <strong>સ્વચાલિત સેવ:</strong> પ્રોજેક્ટ બન્યા પછી આઈડિયા, સ્ક્રિપ્ટ, સ્લાઈડ્સ, ઓડિયો, એડિટિંગ, કેન્વા અને SEO દરેક ટૂલનું કામ આ પ્રોજેક્ટમાં આપોઆપ સેવ થતું રહેશે.
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="btn-cancel-create-modal" class="btn btn-secondary" style="font-weight: 700;">રદ કરો</button>
            <button id="btn-submit-create-modal" class="btn btn-success" style="font-weight: 800; padding: 10px 22px;">
              ✨ પ્રોજેક્ટ શરૂ કરો
            </button>
          </div>
        </div>
      </div>

      <!-- Backup & Restore Modal -->
      <div id="modal-backup" class="custom-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(6px); z-index: 9999; align-items: center; justify-content: center; padding: 20px;">
        <div class="card" style="width: 100%; max-width: 500px; background: #0f172a; border: 1.5px solid rgba(255,255,255,0.15); box-shadow: 0 20px 50px rgba(0,0,0,0.7); border-radius: 14px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>💾</span> ડેટા બેકઅપ અને રીસ્ટોર
            </h3>
            <button id="btn-close-backup-modal" class="btn btn-outline btn-sm" style="border: none; font-size: 1.2rem; padding: 2px 8px; color: var(--text-muted);">✕</button>
          </div>

          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 18px;">
            તમારા બધા પ્રોજેક્ટ્સનો બેકઅપ ફાઈલ તરીકે ડાઉનલોડ કરો અથવા કોઈ જૂનો બેકઅપ અપલોડ કરી રીસ્ટોર કરો.
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
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

    // Attach Event Handlers
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

    // Category filter buttons
    container.querySelectorAll('.btn-category-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-cat');
        render();
      });
    });

    // Create New Project Modal open
    const openCreateModal = () => {
      const modal = container.querySelector('#modal-create-project');
      if (modal) {
        modal.style.display = 'flex';
        const input = container.querySelector('#input-new-project-name');
        if (input) {
          input.value = '';
          input.focus();
        }
      }
    };

    container.querySelector('#btn-create-new-project-top')?.addEventListener('click', openCreateModal);
    container.querySelector('#btn-create-first-project')?.addEventListener('click', openCreateModal);

    // Modal Close
    const closeCreateModal = () => {
      const modal = container.querySelector('#modal-create-project');
      if (modal) modal.style.display = 'none';
    };
    container.querySelector('#btn-close-create-modal')?.addEventListener('click', closeCreateModal);
    container.querySelector('#btn-cancel-create-modal')?.addEventListener('click', closeCreateModal);

    // Modal Submit
    container.querySelector('#btn-submit-create-modal')?.addEventListener('click', () => {
      const nameInput = container.querySelector('#input-new-project-name');
      const catSelect = container.querySelector('#select-new-project-cat');
      const name = nameInput ? nameInput.value.trim() : '';
      const cat = catSelect ? catSelect.value : 'સરકારી યોજના';

      if (!name) {
        alert('કૃપા કરીને પ્રોજેક્ટનું નામ દાખલ કરો! (Please enter project name)');
        nameInput?.focus();
        return;
      }

      const newProj = projectState.createProject(name, name, cat);
      closeCreateModal();
      // Immediately navigate to Step 1 (Idea) for this new project!
      navigateTo('topics');
    });

    // Enter key submits modal
    container.querySelector('#input-new-project-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        container.querySelector('#btn-submit-create-modal')?.click();
      }
    });

    // Resume Project Button (resumes directly from last step)
    container.querySelectorAll('.btn-resume-project').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const step = btn.getAttribute('data-step') || 'topics';
        projectState.setActiveProject(id);
        navigateTo(step);
      });
    });

    // Direct Tool Chip Click (e.g. click 🎙️ to open Voice, 📑 to open Slides)
    container.querySelectorAll('.btn-tool-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = chip.getAttribute('data-id');
        const tool = chip.getAttribute('data-tool');
        if (id && tool) {
          projectState.setActiveProject(id);
          navigateTo(tool);
        }
      });
    });

    // Open Workspace Button
    container.querySelectorAll('.btn-open-workspace').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        projectState.setActiveProject(id);
        navigateTo('workspace');
      });
    });

    // Rename Project Button
    container.querySelectorAll('.btn-rename-project').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const proj = projectState.getProjects().find(p => p.id === id);
        if (!proj) return;

        const newName = prompt('પ્રોજેક્ટનું નવું નામ આપો:', proj.name);
        if (newName && newName.trim()) {
          projectState.renameProject(id, newName);
          render();
        }
      });
    });

    // Duplicate Project Button
    container.querySelectorAll('.btn-duplicate-project').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        projectState.duplicateProject(id);
        render();
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
