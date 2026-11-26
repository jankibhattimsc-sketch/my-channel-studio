class TopicIdea {
  final String id;
  final String title;
  final String category;
  final String summary;
  final String hook;
  final String views48h;
  final String rpm;
  final bool isSaved;
  final DateTime createdAt;

  TopicIdea({
    required this.id,
    required this.title,
    this.category = 'સરકારી યોજના',
    this.summary = '',
    this.hook = '',
    this.views48h = 'નવી જાહેરાત',
    this.rpm = '₹૧૮૦-₹૨૫૦',
    this.isSaved = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  TopicIdea copyWith({
    String? id,
    String? title,
    String? category,
    String? summary,
    String? hook,
    String? views48h,
    String? rpm,
    bool? isSaved,
    DateTime? createdAt,
  }) {
    return TopicIdea(
      id: id ?? this.id,
      title: title ?? this.title,
      category: category ?? this.category,
      summary: summary ?? this.summary,
      hook: hook ?? this.hook,
      views48h: views48h ?? this.views48h,
      rpm: rpm ?? this.rpm,
      isSaved: isSaved ?? this.isSaved,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'topicName': title,
      'name': title,
      'category': category,
      'summary': summary,
      'hook': hook,
      'views48h': views48h,
      'rpm': rpm,
      'isSaved': isSaved,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory TopicIdea.fromJson(Map<String, dynamic> json) {
    return TopicIdea(
      id: (json['id'] ?? json['topicId'] ?? 'topic_${DateTime.now().millisecondsSinceEpoch}').toString(),
      title: (json['title'] ?? json['topicName'] ?? json['name'] ?? json['suggestedTitle'] ?? '').toString().trim(),
      category: (json['category'] ?? 'સરકારી યોજના').toString(),
      summary: (json['summary'] ?? json['hook'] ?? '').toString(),
      hook: (json['hook'] ?? '').toString(),
      views48h: (json['views48h'] ?? json['views'] ?? 'નવી જાહેરાત').toString(),
      rpm: (json['rpm'] ?? '₹૧૮૦-₹૨૫૦').toString(),
      isSaved: json['isSaved'] == true,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }
}
