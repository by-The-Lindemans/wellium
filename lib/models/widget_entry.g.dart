// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'widget_entry.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class WidgetEntryAdapter extends TypeAdapter<WidgetEntry> {
  @override
  final int typeId = 0;

  @override
  WidgetEntry read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return WidgetEntry(
      widgetId: fields[0] as String,
      content: fields[2] as String,
    );
  }

  @override
  void write(BinaryWriter writer, WidgetEntry obj) {
    writer
      ..writeByte(3)
      ..writeByte(0)
      ..write(obj.widgetId)
      ..writeByte(1)
      ..write(obj.timestamp)
      ..writeByte(2)
      ..write(obj.content);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is WidgetEntryAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
