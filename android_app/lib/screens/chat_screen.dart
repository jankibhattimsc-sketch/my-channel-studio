import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

class ChatScreen extends StatefulWidget {
  final String serverUrl;

  const ChatScreen({super.key, required this.serverUrl});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List<Map<String, dynamic>> _conversations = [];
  String _activeConvId = 'default-conv';
  String _activeConvTitle = 'મુખ્ય ચર્ચા (Main Chat)';
  List<Map<String, dynamic>> _messages = [];
  bool _isLoadingMessages = false;
  bool _isSending = false;
  bool _includeChannelContext = true;
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<Map<String, String>> _quickPromptChips = [
    {
      'label': '💡 આજના 3 વાયરલ આઈડિયા',
      'prompt': 'મારી ચેનલ માટે આજના 3 શ્રેષ્ઠ અને હાઇ-ડિમાન્ડ વિડીયો આઈડિયા આપો',
    },
    {
      'label': '📊 48h એનાલિટિક્સ વિશ્લેષણ',
      'prompt': 'મારા છેલ્લા 48 કલાકના એનાલિટિક્સનું વિશ્લેષણ કરો અને વ્યુઝ વધારવા શું કરવું તે જણાવો',
    },
    {
      'label': '⚡ 60s શોર્ટ્સ સ્ક્રિપ્ટ',
      'prompt': 'ગુજરાત સરકારની નવી યોજના પર 60 સેકન્ડના વાયરલ શોર્ટ્સ માટે દમદાર હૂક અને સ્ક્રિપ્ટ લખો',
    },
    {
      'label': '🎯 ઓડિયન્સ રીટેન્શન હૂક',
      'prompt': 'દર્શકો વિડીયો વચ્ચેથી છોડીને ના જાય તે માટે પ્રથમ 30 સેકન્ડનો હૂક કેવી રીતે બનાવવો?',
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _loadConversations() async {
    try {
      final res = await http.get(Uri.parse('${widget.serverUrl}/api/chat/conversations'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['conversations'] is List) {
          final list = List<Map<String, dynamic>>.from(data['conversations']);
          if (mounted) {
            setState(() {
              _conversations = list;
              if (list.isNotEmpty && !list.any((c) => c['id'] == _activeConvId)) {
                _activeConvId = list.first['id'].toString();
                _activeConvTitle = list.first['title']?.toString() ?? 'ચર્ચા';
              }
            });
            _loadMessages(_activeConvId);
          }
        }
      }
    } catch (_) {
      // Offline or network error
      _loadMessages(_activeConvId);
    }
  }

  Future<void> _createNewConversation() async {
    try {
      final res = await http.post(
        Uri.parse('${widget.serverUrl}/api/chat/conversations'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'title': 'નવી ચર્ચા (New Chat)'}),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['conversation'] != null) {
          final newConv = Map<String, dynamic>.from(data['conversation']);
          setState(() {
            _conversations.insert(0, newConv);
            _activeConvId = newConv['id'].toString();
            _activeConvTitle = newConv['title']?.toString() ?? 'નવી ચર્ચા';
            _messages = [];
          });
          _showSnack('નવી ચર્ચા શરૂ થઈ!');
          return;
        }
      }
    } catch (_) {}

    // Fallback local new chat
    final newId = 'conv_${DateTime.now().millisecondsSinceEpoch}';
    setState(() {
      _activeConvId = newId;
      _activeConvTitle = 'નવી ચર્ચા (New Chat)';
      _messages = [];
    });
    _showSnack('નવી ચર્ચા શરૂ થઈ!');
  }

  Future<void> _deleteConversation(String id) async {
    try {
      await http.delete(Uri.parse('${widget.serverUrl}/api/chat/conversations/$id'));
      _loadConversations();
      _showSnack('ચર્ચા કાઢી નાખવામાં આવી!');
    } catch (e) {
      _showSnack('ચર્ચા કાઢી શકાઈ નથી: $e', isError: true);
    }
  }

  Future<void> _loadMessages(String convId) async {
    if (!mounted) return;
    setState(() => _isLoadingMessages = true);
    try {
      final res = await http.get(Uri.parse('${widget.serverUrl}/api/chat/conversations/$convId/messages'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['messages'] is List) {
          if (mounted) {
            setState(() {
              _messages = List<Map<String, dynamic>>.from(data['messages']);
              _isLoadingMessages = false;
            });
            _scrollToBottom();
            return;
          }
        }
      }
    } catch (_) {}

    if (mounted) {
      setState(() => _isLoadingMessages = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(String text) async {
    final cleanText = text.trim();
    if (cleanText.isEmpty || _isSending) return;

    _inputController.clear();

    // Immediately show user message in list
    final tempUserMsg = {
      'role': 'user',
      'content': cleanText,
      'createdAt': DateTime.now().toIso8601String(),
    };

    setState(() {
      _messages.add(tempUserMsg);
      _isSending = true;
    });
    _scrollToBottom();

    try {
      final res = await http.post(
        Uri.parse('${widget.serverUrl}/api/chat/message'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'conversationId': _activeConvId,
          'message': cleanText,
          'includeChannelContext': _includeChannelContext,
        }),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          final replyText = data['message']?['content']?.toString() ??
              data['reply']?.toString() ??
              data['assistantMessage']?['content']?.toString() ??
              'જવાબ પ્રાપ્ત થયો નથી.';

          final assistantMsg = {
            'role': 'assistant',
            'content': replyText,
            'createdAt': DateTime.now().toIso8601String(),
          };

          if (mounted) {
            setState(() {
              _messages.add(assistantMsg);
              _isSending = false;
            });
            _scrollToBottom();
          }
          return;
        }
      }

      // If backend returned error message
      if (mounted) {
        final errorMsg = {
          'role': 'assistant',
          'content': 'ક્ષમા કરશો, જવાબ તૈયાર કરવામાં વિલંબ થયો છે. કૃપા કરીને સર્વર કનેક્શન તપાસો.',
          'createdAt': DateTime.now().toIso8601String(),
        };
        setState(() {
          _messages.add(errorMsg);
          _isSending = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        final errorMsg = {
          'role': 'assistant',
          'content': 'નેટવર્ક કનેક્શન ભૂલ: સર્વર સાથે સંપર્ક થઈ શક્યો નથી ($e)',
          'createdAt': DateTime.now().toIso8601String(),
        };
        setState(() {
          _messages.add(errorMsg);
          _isSending = false;
        });
        _scrollToBottom();
      }
    }
  }

  void _showConversationsSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF131722),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '💬 ચર્ચા ઇતિહાસ (Recent Chats)',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.grey),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF0000),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 44),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('નવી ચર્ચા બનાવો (New Chat)', style: TextStyle(fontWeight: FontWeight.bold)),
                    onPressed: () {
                      Navigator.pop(context);
                      _createNewConversation();
                    },
                  ),
                  const SizedBox(height: 16),
                  if (_conversations.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text('હજુ સુધી કોઈ અગાઉની ચર્ચા નથી.', style: TextStyle(color: Colors.grey)),
                      ),
                    )
                  else
                    ConstrainedBox(
                      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.4),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: _conversations.length,
                        separatorBuilder: (context, index) => const Divider(color: Color(0xFF1E293B), height: 1),
                        itemBuilder: (context, index) {
                          final conv = _conversations[index];
                          final id = conv['id'].toString();
                          final title = conv['title']?.toString() ?? 'ચર્ચા ${index + 1}';
                          final isSelected = (id == _activeConvId);

                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            leading: Icon(
                              Icons.chat_bubble_outline,
                              color: isSelected ? const Color(0xFF38BDF8) : Colors.grey,
                              size: 20,
                            ),
                            title: Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: isSelected ? const Color(0xFF38BDF8) : Colors.white,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                fontSize: 14,
                              ),
                            ),
                            trailing: _conversations.length > 1
                                ? IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Colors.grey, size: 18),
                                    onPressed: () {
                                      Navigator.pop(context);
                                      _deleteConversation(id);
                                    },
                                  )
                                : null,
                            onTap: () {
                              Navigator.pop(context);
                              setState(() {
                                _activeConvId = id;
                                _activeConvTitle = title;
                              });
                              _loadMessages(id);
                            },
                          );
                        },
                      ),
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0D14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0D14),
        elevation: 0,
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '✨ ChatGPT Creator Assistant',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              _activeConvTitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history, color: Colors.white70),
            tooltip: 'ચર્ચા ઇતિહાસ',
            onPressed: _showConversationsSheet,
          ),
          IconButton(
            icon: const Icon(Icons.add, color: Color(0xFF38BDF8)),
            tooltip: 'નવી ચર્ચા',
            onPressed: _createNewConversation,
          ),
        ],
      ),
      body: Column(
        children: [
          // Context Toggle Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: Color(0xFF131722),
              border: Border(bottom: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Icon(
                        Icons.insights,
                        size: 16,
                        color: _includeChannelContext ? const Color(0xFF10B981) : Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'ચેનલ એનાલિટિક્સ સંદર્ભ સામેલ કરો (Channel Context)',
                          style: TextStyle(fontSize: 11, color: Colors.white70),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _includeChannelContext,
                  activeThumbColor: const Color(0xFF10B981),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  onChanged: (val) {
                    setState(() => _includeChannelContext = val);
                  },
                ),
              ],
            ),
          ),

          // Messages List Area
          Expanded(
            child: _isLoadingMessages
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFFFF0000)),
                  )
                : _messages.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 64,
                                height: 64,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF8B5CF6).withValues(alpha: 0.15),
                                  shape: BoxShape.circle,
                                ),
                                child: const Center(
                                  child: Text('✨', style: TextStyle(fontSize: 32)),
                                ),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'નવી ચર્ચા શરૂ કરો!',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'ગુજરાતીમાં કોઈપણ પ્રશ્ન પૂછો: વાયરલ આઈડિયા, વિડીયો સ્ક્રિપ્ટ, કીવર્ડ્સ અથવા એનાલિટિક્સ સુધારણા.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isUser = (msg['role'] == 'user');
                          final content = msg['content']?.toString() ?? '';

                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                              children: [
                                if (!isUser) ...[
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        colors: [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
                                      ),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: const Center(
                                      child: Text('🤖', style: TextStyle(fontSize: 16)),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                ],
                                Flexible(
                                  child: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: isUser ? const Color(0xFF2563EB) : const Color(0xFF131722),
                                      borderRadius: BorderRadius.only(
                                        topLeft: const Radius.circular(14),
                                        topRight: const Radius.circular(14),
                                        bottomLeft: Radius.circular(isUser ? 14 : 2),
                                        bottomRight: Radius.circular(isUser ? 2 : 14),
                                      ),
                                      border: Border.all(
                                        color: isUser ? const Color(0xFF3B82F6) : const Color(0xFF1E293B),
                                        width: 1,
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        SelectableText(
                                          content,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: Colors.white,
                                            height: 1.45,
                                          ),
                                        ),
                                        if (!isUser) ...[
                                          const SizedBox(height: 8),
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.end,
                                            children: [
                                              GestureDetector(
                                                onTap: () {
                                                  Clipboard.setData(ClipboardData(text: content));
                                                  _showSnack('જવાબ કોપી થઈ ગયો!');
                                                },
                                                child: Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFF1E293B),
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  child: const Row(
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      Icon(Icons.copy, size: 12, color: Colors.white70),
                                                      SizedBox(width: 4),
                                                      Text('Copy', style: TextStyle(fontSize: 10, color: Colors.white70)),
                                                    ],
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ),
                                if (isUser) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF1E293B),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: const Center(
                                      child: Text('👤', style: TextStyle(fontSize: 16)),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
          ),

          if (_isSending)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              alignment: Alignment.centerLeft,
              child: const Row(
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF8B5CF6)),
                  ),
                  SizedBox(width: 10),
                  Text(
                    'ચેટજીપીટી જવાબ લખી રહ્યું છે...',
                    style: TextStyle(fontSize: 11, color: Color(0xFF8B5CF6)),
                  ),
                ],
              ),
            ),

          // Quick Action Prompt Chips
          SizedBox(
            height: 42,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: _quickPromptChips.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final chip = _quickPromptChips[index];
                return ActionChip(
                  backgroundColor: const Color(0xFF131722),
                  side: const BorderSide(color: Color(0xFF1E293B)),
                  label: Text(
                    chip['label']!,
                    style: const TextStyle(fontSize: 11, color: Colors.white),
                  ),
                  onPressed: () => _sendMessage(chip['prompt']!),
                );
              },
            ),
          ),

          const SizedBox(height: 6),

          // Input Bar
          Container(
            padding: EdgeInsets.only(
              left: 12,
              right: 12,
              top: 8,
              bottom: MediaQuery.of(context).viewInsets.bottom > 0
                  ? MediaQuery.of(context).viewInsets.bottom + 8
                  : 14,
            ),
            decoration: const BoxDecoration(
              color: Color(0xFF131722),
              border: Border(top: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputController,
                    style: const TextStyle(fontSize: 13, color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'ગુજરાતીમાં કોઈપણ પ્રશ્ન પૂછો...',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      filled: true,
                      fillColor: const Color(0xFF0A0D14),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: const BorderSide(color: Color(0xFF1E293B)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: const BorderSide(color: Color(0xFF1E293B)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: const BorderSide(color: Color(0xFF8B5CF6)),
                      ),
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFFFF0000),
                    foregroundColor: Colors.white,
                    shape: const CircleBorder(),
                  ),
                  icon: const Icon(Icons.send, size: 18),
                  onPressed: () => _sendMessage(_inputController.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
