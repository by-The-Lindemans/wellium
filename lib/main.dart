import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app.dart'; // Add this import
import 'models/widget_entry.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  Hive.registerAdapter(WidgetEntryAdapter());
  await Hive.openBox<WidgetEntry>('entries');
  runApp(const MyApp()); // MyApp from app.dart
}
