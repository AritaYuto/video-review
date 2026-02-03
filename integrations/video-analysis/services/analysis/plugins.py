"""Plugin definitions for analysis pipeline."""

main_plugin_definitions = [
    ("ObjectDetectionPlugin", "object_detection"),
    ("FaceRecognitionPlugin", "face_recognition"),
    ("ShotTypePlugin", "shot_type"),
    ("DominantColorPlugin", "dominant_color"),
    ("DescriptorPlugin", "descriptor"),
    ("TextDetectionPlugin", "text_detection"),
]

post_plugin_definitions = [
    ("ScenesExportPlugin", "scenes"),
]
