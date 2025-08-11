#!/usr/bin/env python3
"""
Script to crop individual badges from the combined badge image
"""

from PIL import Image
import os

def crop_badges():
    """Crop individual badges from the combined image"""
    
    # Input image path (you'll need to save your image here)
    input_image_path = "../images/all-badges.png"  # You'll paste your image here
    output_dir = "../images/badges/"
    
    # Check if input image exists
    if not os.path.exists(input_image_path):
        print(f"❌ Please save your badge image as: {input_image_path}")
        return
    
    # Load the image
    try:
        img = Image.open(input_image_path)
        print(f"✅ Loaded image: {img.size}")
    except Exception as e:
        print(f"❌ Error loading image: {e}")
        return
    
    # Badge positions based on your image (4x3 grid)
    # Assuming roughly equal spacing
    width, height = img.size
    badge_width = width // 4
    badge_height = height // 3
    
    # Badge definitions with tier info
    badges = [
        # Row 1
        {"name": "S+_crypto_whale", "tier": "S+", "row": 0, "col": 0, "scores": "90-100"},
        {"name": "S_defi_expert", "tier": "S", "row": 0, "col": 1, "scores": "80-89"},
        {"name": "A+_advanced_user", "tier": "A+", "row": 0, "col": 2, "scores": "70-79"},
        {"name": "A_experienced_user", "tier": "A", "row": 0, "col": 3, "scores": "60-69"},
        
        # Row 2  
        {"name": "B+_active_user", "tier": "B+", "row": 1, "col": 0, "scores": "50-59"},
        {"name": "B_regular_user", "tier": "B", "row": 1, "col": 1, "scores": "40-49"},
        {"name": "C+_casual_user", "tier": "C+", "row": 1, "col": 2, "scores": "30-39"},
        {"name": "C_beginner", "tier": "C", "row": 1, "col": 3, "scores": "20-29"},
        
        # Row 3
        {"name": "D_new_user", "tier": "D", "row": 2, "col": 0, "scores": "10-19"},
        {"name": "F_inactive", "tier": "F", "row": 2, "col": 1, "scores": "0-9"},
    ]
    
    print(f"🎨 Cropping badges into {badge_width}x{badge_height} pixels each...")
    
    for badge in badges:
        # Calculate crop coordinates
        left = badge["col"] * badge_width
        top = badge["row"] * badge_height
        right = left + badge_width
        bottom = top + badge_height
        
        # Add some padding to avoid cutting edges
        padding = 20
        left = max(0, left - padding)
        top = max(0, top - padding)
        right = min(width, right + padding)
        bottom = min(height, bottom + padding)
        
        # Crop the badge
        cropped = img.crop((left, top, right, bottom))
        
        # Save the individual badge
        output_path = os.path.join(output_dir, f"{badge['name']}.png")
        cropped.save(output_path, "PNG")
        
        print(f"✅ Saved: {badge['tier']} ({badge['scores']}) -> {output_path}")
    
    print(f"\n🎉 Successfully cropped {len(badges)} badges!")
    print(f"📁 Badges saved in: {output_dir}")
    
    # Create a mapping file for the system
    create_badge_mapping(badges, output_dir)

def create_badge_mapping(badges, output_dir):
    """Create a JSON mapping file for the badge system"""
    
    mapping = {}
    for badge in badges:
        # Extract score ranges for mapping
        scores = badge["scores"].split("-")
        min_score = int(scores[0])
        max_score = int(scores[1]) if len(scores) > 1 else 100
        
        mapping[badge["tier"]] = {
            "filename": f"{badge['name']}.png",
            "path": f"images/badges/{badge['name']}.png",
            "min_score": min_score,
            "max_score": max_score,
            "description": badge["name"].replace("_", " ").title()
        }
    
    # Save mapping to JSON file
    import json
    mapping_path = os.path.join(output_dir, "badge-mapping.json")
    with open(mapping_path, 'w') as f:
        json.dump(mapping, f, indent=2)
    
    print(f"📋 Badge mapping saved to: {mapping_path}")

if __name__ == "__main__":
    crop_badges()
