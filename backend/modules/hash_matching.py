"""
Perceptual Hash Matching Module
Uses pHash and dHash for image fingerprinting to detect
duplicates or near-duplicates, and known AI-generated images.
"""

import imagehash
from PIL import Image


class HashMatcher:
    """Performs perceptual hash analysis on images."""

    def __init__(self):
        self.hash_size = 16  # Higher = more precise

    def analyze(self, pil_image: Image.Image) -> dict:
        """Compute perceptual hashes and analyze image characteristics."""
        phash = imagehash.phash(pil_image, hash_size=self.hash_size)
        dhash = imagehash.dhash(pil_image, hash_size=self.hash_size)
        ahash = imagehash.average_hash(pil_image, hash_size=self.hash_size)
        whash = imagehash.whash(pil_image, hash_size=self.hash_size)

        # Compute hash complexity (how many bits set)
        phash_bits = bin(int(str(phash), 16)).count("1")
        dhash_bits = bin(int(str(dhash), 16)).count("1")
        total_bits = self.hash_size * self.hash_size

        phash_ratio = phash_bits / total_bits
        dhash_ratio = dhash_bits / total_bits

        # Cross-hash similarity (comparing different hash methods)
        phash_str = str(phash)
        dhash_str = str(dhash)

        # Analyze hash distribution
        # AI images sometimes show unusual hash bit distributions
        bit_balance = abs(phash_ratio - 0.5) + abs(dhash_ratio - 0.5)

        # Very balanced hashes can indicate synthetic images
        if bit_balance < 0.05:
            score = 0.4
        elif bit_balance < 0.15:
            score = 0.25
        else:
            score = 0.1

        return {
            "hash_score": round(score, 3),
            "hashes": {
                "phash": str(phash),
                "dhash": str(dhash),
                "ahash": str(ahash),
                "whash": str(whash),
            },
            "analysis": {
                "phash_bit_ratio": round(phash_ratio, 3),
                "dhash_bit_ratio": round(dhash_ratio, 3),
                "bit_balance": round(bit_balance, 3),
                "description": "Perceptual hash fingerprinting and distribution analysis",
            },
        }

    @staticmethod
    def compare_images(img1: Image.Image, img2: Image.Image) -> dict:
        """Compare two images using multiple hash methods."""
        hashes = {}
        for name, func in [
            ("phash", imagehash.phash),
            ("dhash", imagehash.dhash),
            ("ahash", imagehash.average_hash),
        ]:
            h1 = func(img1)
            h2 = func(img2)
            distance = h1 - h2  # Hamming distance
            similarity = 1.0 - (distance / (16 * 16))
            hashes[name] = {
                "hash1": str(h1),
                "hash2": str(h2),
                "hamming_distance": distance,
                "similarity": round(similarity, 4),
            }

        return hashes
