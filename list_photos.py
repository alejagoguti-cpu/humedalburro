import os

aves_photos = os.listdir('assets/fotos/fotos_aves')
print(f"Total photos in fotos_aves: {len(aves_photos)}")
for p in sorted(aves_photos)[:30]:
    print(" ", repr(p))
