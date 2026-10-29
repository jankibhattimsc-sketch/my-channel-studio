import { api } from '../api.js';
import { copyToClipboard } from '../utils/clipboard.js';

export async function renderChatGPT(container, navigateTo) {
  let activeConvId = 'default-conv';
  let conversations = [];

  container.innerHTML = `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
      <div>
        <h2 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 10px;">
          <span>✨</span> ChatGPT Creator Assistant (ચેટજીપીટી ક્રિએટર આસિસ્ટન્ટ)
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.88rem;">
          સત્તાવાર OpenAI API પાવર્ડ એઆઈ • ગુજરાતી પ્રશ્નોત્તરી, વાયરલ હૂક, સંપૂર્ણ સ્ક્રિપ્ટ અને એનાલિટિક્સ વિશ્લેષણ
        </p>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer;">
          <input type="checkbox" id="chk-channel-context" checked style="accent-color: var(--accent-emerald);">
          <span>ચેનલ એનાલિટિક્સ સંદર્ભ સામેલ કરો (Channel Context)</span>
        </label>
        <button id="btn-new-chat" class="btn btn-primary btn-sm">
          <span>➕</span> નવી ચર્ચા (New Chat)
        </button>
      </div>
    </div>

    <!-- Chat Workspace Layout -->
    <div class="chat-container">
      <!-- Left Sidebar: Conversations History -->
      <div class="chat-sidebar" id="conversations-list">
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">ચર્ચા ઇતિહાસ (Recent Chats)</span>
        <!-- Populated dynamically -->
      </div>

      <!-- Right Main: Active Chat Window -->
      <div class="chat-main">
        <!-- Messages Area -->
        <div class="chat-messages-area" id="chat-messages-area">
          <div style="text-align: center; padding: 40px;">
            <div class="pulse-indicator"></div>
          </div>
        </div>

        <!-- Quick Action Prompt Chips -->
        <div class="chat-quick-chips">
          <button class="btn btn-outline btn-sm quick-chip" data-text="મારી ચેનલ માટે આજના 3 શ્રેષ્ઠ અને હાઇ-ડિમાન્ડ વિડીયો આઈડિયા આપો">
            💡 આજના 3 વાયરલ આઈડિયા
          </button>
          <button class="btn btn-outline btn-sm quick-chip" data-text="મારા છેલ્લા 48 કલાકના એનાલિટિક્સનું વિશ્લેષણ કરો અને વ્યુઝ વધારવા શું કરવું તે જણાવો">
            📊 48h એનાલિટિક્સ વિશ્લેષણ
          </button>
          <button class="btn btn-outline btn-sm quick-chip" data-text="ગુજરાત સરકારની નવી યોજના પર 60 સેકન્ડના વાયરલ શોર્ટ્સ માટે દમદાર હૂક અને સ્ક્રિપ્ટ લખો">
            ⚡ 60s શોર્ટ્સ સ્ક્રિપ્ટ
          </button>
          <button class="btn btn-outline btn-sm quick-chip" data-text="દર્શકો વિડીયો વચ્ચેથી છોડીને ના જાય તે માટે પ્રથમ 30 સેકન્ડનો હૂક કેવી રીતે બનાવવો?">
            🎯 ઓડિયન્સ રીટેન્શન હૂક
          </button>
        </div>

        <!-- Input Bar -->
        <div class="chat-input-bar">
          <input type="text" id="chat-input-field" class="form-input" placeholder="ગુજરાતીમાં કોઈપણ પ્રશ્ન પૂછો (દા.ત. સ્ક્રિપ્ટ લખો, હૂક સુધારો, કીવર્ડ્સ આપો)..." style="flex: 1;">
          <button id="btn-send-message" class="btn btn-primary" style="padding: 0 24px;">
            <span>➤</span> મોકલો (Send)
          </button>
        </div>
      </div>
    </div>
  `;

  const convsListEl = container.querySelector('#conversations-list');
  const messagesAreaEl = container.querySelector('#chat-messages-area');
  const inputFieldEl = container.querySelector('#chat-input-field');
  const sendBtnEl = container.querySelector('#btn-send-message');
  const newChatBtn = container.querySelector('#btn-new-chat');
  const channelContextChk = container.querySelector('#chk-channel-context');

  // Load conversations
  async function loadConversations() {
    try {
      const res = await api.getConversations();
      conversations = res.conversations || [];
      if (conversations.length > 0 && !conversations.some(c => c.id === activeConvId)) {
        activeConvId = conversations[0].id;
      }
      renderConversationsList();
      loadMessages(activeConvId);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  }

  function renderConversationsList() {
    convsListEl.innerHTML = `
      <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">ચર્ચા ઇતિહાસ (History)</span>
      ${conversations.map(c => `
        <div class="conv-item ${c.id === activeConvId ? 'active' : ''}" data-conv-id="${c.id}">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
            💬 ${c.title}
          </span>
          ${conversations.length > 1 ? `
            <button class="delete-conv-btn" data-conv-id="${c.id}" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem;" title="કાઢી નાખો">✕</button>
          ` : ''}
        </div>
      `).join('')}
    `;

    convsListEl.querySelectorAll('.conv-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-conv-btn')) return;
        const id = el.getAttribute('data-conv-id');
        activeConvId = id;
        renderConversationsList();
        loadMessages(id);
      });
    });

    convsListEl.querySelectorAll('.delete-conv-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-conv-id');
        if (confirm('શું તમે આ ચર્ચા કાઢી નાખવા માંગો છો?')) {
          await api.deleteConversation(id);
          loadConversations();
        }
      });
    });
  }

  // Load messages for active conversation
  async function loadMessages(convId) {
    messagesAreaEl.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="pulse-indicator"></div>
      </div>
    `;

    try {
      const res = await api.getMessages(convId);
      const messages = res.messages || [];

      if (messages.length === 0) {
        messagesAreaEl.innerHTML = `
          <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
            <span style="font-size: 2rem; display: block; margin-bottom: 10px;">✨</span>
            <p>નવી ચર્ચા શરૂ કરો! નીચે પ્રશ્ન લખો અથવા ક્વિક ચિપ્સ પસંદ કરો.</p>
          </div>
        `;
        return;
      }

      messagesAreaEl.innerHTML = messages.map(m => `
        <div class="chat-bubble ${m.role}">
          <div class="chat-avatar ${m.role === 'assistant' ? 'assistant-avatar' : 'user-avatar'}">
            ${m.role === 'assistant' ? '🤖' : '👤'}
          </div>
          <div style="max-width: 90%;">
            <div class="chat-text">
              ${m.content.replace(/\n/g, '<br>')}
            </div>
            ${m.role === 'assistant' ? `
              <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
                <button class="btn btn-outline btn-sm copy-msg-btn" data-copy="${encodeURIComponent(m.content)}" style="font-size: 0.72rem; padding: 2px 8px;">
                  📋 Copy
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('');

      messagesAreaEl.querySelectorAll('.copy-msg-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const text = decodeURIComponent(e.currentTarget.getAttribute('data-copy'));
          copyToClipboard(text, 'જવાબ કોપી થઈ ગયો!');
        });
      });

      // Scroll to bottom
      messagesAreaEl.scrollTop = messagesAreaEl.scrollHeight;

    } catch (err) {
      messagesAreaEl.innerHTML = `<div class="alert alert-warning">${err.message}</div>`;
    }
  }

  // Send message
  async function sendMessage(text) {
    const content = text || inputFieldEl.value.trim();
    if (!content) return;

    inputFieldEl.value = '';

    // Append user message optimistically
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.innerHTML = `
      <div class="chat-avatar user-avatar">👤</div>
      <div class="chat-text">${content.replace(/\n/g, '<br>')}</div>
    `;
    messagesAreaEl.appendChild(userBubble);

    // Append loading assistant bubble
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble assistant';
    loadingBubble.innerHTML = `
      <div class="chat-avatar assistant-avatar">🤖</div>
      <div class="chat-text">
        <span class="pulse-indicator" style="width: 10px; height: 10px;"></span> વિચાર કરી રહ્યો છું...
      </div>
    `;
    messagesAreaEl.appendChild(loadingBubble);
    messagesAreaEl.scrollTop = messagesAreaEl.scrollHeight;

    try {
      const res = await api.sendChatMessage(
        activeConvId,
        content,
        channelContextChk.checked
      );

      // Replace loading bubble with real reply
      loadingBubble.innerHTML = `
        <div class="chat-avatar assistant-avatar">🤖</div>
        <div style="max-width: 90%;">
          <div class="chat-text">
            ${res.message.content.replace(/\n/g, '<br>')}
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
            <button class="btn btn-outline btn-sm copy-msg-btn" data-copy="${encodeURIComponent(res.message.content)}" style="font-size: 0.72rem; padding: 2px 8px;">
              📋 Copy
            </button>
          </div>
        </div>
      `;

      loadingBubble.querySelector('.copy-msg-btn')?.addEventListener('click', (e) => {
        const textToCopy = decodeURIComponent(e.currentTarget.getAttribute('data-copy'));
        copyToClipboard(textToCopy, 'જવાબ કોપી થઈ ગયો!');
      });

      messagesAreaEl.scrollTop = messagesAreaEl.scrollHeight;

    } catch (err) {
      loadingBubble.innerHTML = `
        <div class="chat-avatar assistant-avatar">⚠️</div>
        <div class="chat-text" style="color: #f87171;">
          સંદેશ મોકલવામાં ભૂલ: ${err.message}
        </div>
      `;
    }
  }

  // Events
  sendBtnEl.addEventListener('click', () => sendMessage());
  inputFieldEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  newChatBtn.addEventListener('click', async () => {
    const res = await api.createConversation('નવી ચર્ચા');
    activeConvId = res.conversation.id;
    loadConversations();
  });

  container.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const text = e.currentTarget.getAttribute('data-text');
      sendMessage(text);
    });
  });

  // Check if opened with a pending prompt from Home
  if (window.pendingChatPrompt) {
    const promptToSend = window.pendingChatPrompt;
    window.pendingChatPrompt = null;
    loadConversations().then(() => {
      sendMessage(promptToSend);
    });
  } else {
    loadConversations();
  }
}
