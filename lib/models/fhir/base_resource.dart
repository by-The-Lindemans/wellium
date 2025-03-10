import 'package:hive_flutter/hive_flutter.dart';
import 'meta.dart';

@HiveType(typeId: 1)
class FhirBaseResource extends HiveObject {
  @HiveField(0)
  String resourceType;
  
  @HiveField(1)
  String id;
  
  @HiveField(2)
  FhirMeta? meta;
  
  FhirBaseResource({
    required this.resourceType,
    required this.id,
    this.meta,
  });
  
  // Convert to FHIR JSON format
  Map<String, dynamic> toJson() {
    return {
      'resourceType': resourceType,
      'id': id,
      if (meta != null) 'meta': meta!.toJson(),
    };
  }
  
  // Create from FHIR JSON (to be overridden by subclasses)
  static FhirBaseResource fromJson(Map<String, dynamic> json) {
    return FhirBaseResource(
      resourceType: json['resourceType'],
      id: json['id'],
      meta: json['meta'] != null ? FhirMeta.fromJson(json['meta']) : null,
    );
  }
}

@HiveType(typeId: 2)
class FhirMeta {
  @HiveField(0)
  String? versionId;
  
  @HiveField(1)
  DateTime? lastUpdated;
  
  @HiveField(2)
  List<String>? profile;
  
  @HiveField(3)
  List<String>? security;
  
  @HiveField(4)
  List<String>? tag;
  
  FhirMeta({
    this.versionId,
    this.lastUpdated,
    this.profile,
    this.security,
    this.tag,
  });
  
  Map<String, dynamic> toJson() {
    return {
      if (versionId != null) 'versionId': versionId,
      if (lastUpdated != null) 'lastUpdated': lastUpdated!.toIso8601String(),
      if (profile != null) 'profile': profile,
      if (security != null) 'security': security,
      if (tag != null) 'tag': tag,
    };
  }
  
  static FhirMeta fromJson(Map<String, dynamic> json) {
    return FhirMeta(
      versionId: json['versionId'],
      lastUpdated: json['lastUpdated'] != null 
          ? DateTime.parse(json['lastUpdated']) 
          : null,
      profile: json['profile'] != null 
          ? List<String>.from(json['profile']) 
          : null,
      security: json['security'] != null 
          ? List<String>.from(json['security']) 
          : null,
      tag: json['tag'] != null 
          ? List<String>.from(json['tag']) 
          : null,
    );
  }
}
