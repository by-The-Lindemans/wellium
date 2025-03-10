import 'package:hive_flutter/hive_flutter.dart';

@HiveType(typeId: 3)
class FhirCoding {
  @HiveField(0)
  String? system;
  
  @HiveField(1)
  String? version;
  
  @HiveField(2)
  String? code;
  
  @HiveField(3)
  String? display;
  
  @HiveField(4)
  bool? userSelected;
  
  FhirCoding({
    this.system,
    this.version,
    this.code,
    this.display,
    this.userSelected,
  });
  
  Map<String, dynamic> toJson() {
    return {
      if (system != null) 'system': system,
      if (version != null) 'version': version,
      if (code != null) 'code': code,
      if (display != null) 'display': display,
      if (userSelected != null) 'userSelected': userSelected,
    };
  }
  
  static FhirCoding fromJson(Map<String, dynamic> json) {
    return FhirCoding(
      system: json['system'],
      version: json['version'],
      code: json['code'],
      display: json['display'],
      userSelected: json['userSelected'],
    );
  }
}

@HiveType(typeId: 4)
class FhirCodeableConcept {
  @HiveField(0)
  List<FhirCoding>? coding;
  
  @HiveField(1)
  String? text;
  
  FhirCodeableConcept({
    this.coding,
    this.text,
  });
  
  Map<String, dynamic> toJson() {
    return {
      if (coding != null) 'coding': coding!.map((c) => c.toJson()).toList(),
      if (text != null) 'text': text,
    };
  }
  
  static FhirCodeableConcept fromJson(Map<String, dynamic> json) {
    return FhirCodeableConcept(
      coding: json['coding'] != null 
          ? (json['coding'] as List)
              .map((c) => FhirCoding.fromJson(c))
              .toList() 
          : null,
      text: json['text'],
    );
  }
}
