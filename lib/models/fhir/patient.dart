import 'package:hive_flutter/hive_flutter.dart';
import 'base_resource.dart';

@HiveType(typeId: 5)
class FhirPatient extends FhirBaseResource {
  @HiveField(10)
  bool? active;
  
  @HiveField(11)
  List<FhirHumanName>? name;
  
  @HiveField(12)
  List<FhirContactPoint>? telecom;
  
  @HiveField(13)
  String? gender;
  
  @HiveField(14)
  DateTime? birthDate;
  
  @HiveField(15)
  List<FhirAddress>? address;
  
  FhirPatient({
    required String id,
    this.active = true,
    this.name,
    this.telecom,
    this.gender,
    this.birthDate,
    this.address,
    super.meta,
  }) : super(
    resourceType: 'Patient',
    id: id,
  );
  
  @override
  Map<String, dynamic> toJson() {
    final json = super.toJson();
    return {
      ...json,
      if (active != null) 'active': active,
      if (name != null) 'name': name!.map((n) => n.toJson()).toList(),
      if (telecom != null) 'telecom': telecom!.map((t) => t.toJson()).toList(),
      if (gender != null) 'gender': gender,
      if (birthDate != null) 'birthDate': birthDate!.toIso8601String().substring(0, 10),
      if (address != null) 'address': address!.map((a) => a.toJson()).toList(),
    };
  }
  
  static FhirPatient fromJson(Map<String, dynamic> json) {
    return FhirPatient(
      id: json['id'],
      active: json['active'],
      name: json['name'] != null 
          ? (json['name'] as List).map((n) => FhirHumanName.fromJson(n)).toList() 
          : null,
      telecom: json['telecom'] != null 
          ? (json['telecom'] as List).map((t) => FhirContactPoint.fromJson(t)).toList() 
          : null,
      gender: json['gender'],
      birthDate: json['birthDate'] != null ? DateTime.parse(json['birthDate']) : null,
      address: json['address'] != null 
          ? (json['address'] as List).map((a) => FhirAddress.fromJson(a)).toList() 
          : null,
      meta: json['meta'] != null ? FhirMeta.fromJson(json['meta']) : null,
    );
  }
}