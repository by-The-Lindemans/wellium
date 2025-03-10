import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

class HiveInit {
  static Future<void> init() async {
    await Hive.initFlutter();
    
    // Open all needed boxes
    if (!Hive.isBoxOpen('entries')) {
      await Hive.openBox('entries');
    }
    
    // Other boxes as needed
    // if (!Hive.isBoxOpen('patient')) {
    //   await Hive.openBox('patient');
    // }
  }
}

final hiveInitProvider = FutureProvider<void>((ref) async {
  await HiveInit.init();
});

/// Provider for accessing encryption key
final encryptionKeyProvider = FutureProvider<Uint8List>((ref) async {
  const secureStorage = FlutterSecureStorage();
  final encryptionKeyString = await secureStorage.read(key: 'hive_encryption_key');
  if (encryptionKeyString == null) {
    throw Exception('Encryption key not found. Please initialize Hive first.');
  }
  return base64Url.decode(encryptionKeyString);
});

/// Helper to get or open a box with encryption
Future<Box<T>> _getOrOpenBox<T>(String boxName, Uint8List encryptionKey) async {
  // Check if box is already open
  if (Hive.isBoxOpen(boxName)) {
    return Hive.box<T>(boxName);
  }
  
  // Open the box with encryption
  return await Hive.openBox<T>(
    boxName, 
    encryptionCipher: HiveAesCipher(encryptionKey),
  );
}

/// Provider factory for typed boxes
final boxProvider = <T>(String boxName) => 
  FutureProvider.autoDispose<Box<T>>((ref) async {
    final encryptionKey = await ref.watch(encryptionKeyProvider.future);
    return _getOrOpenBox<T>(boxName, encryptionKey);
  });