"""Seed classic sample chapters as real PDFs.

Run from the backend directory: python seed.py
"""

import asyncio
from datetime import datetime, timezone

import fitz
from fpdf import FPDF

from lib.db import client, db, ensure_indexes
from lib.storage import UPLOAD_DIR

BOOK = "Moral Stories - Reader 4"

CHAPTERS: dict[str, dict] = {
    "sample-thirsty-crow": {
        "title": "The Thirsty Crow",
        "paras": [
            "Once on a hot summer day, a crow flew across a dry village in search of water. He had flown for many hours, and his throat was completely dry. At last, he saw a large pot under a shady tree.",
            "The crow flew down at once and looked inside the pot. There was a little water at the bottom, but his beak could not reach it. He tried to tip the pot over, but it was too heavy for him.",
            "He was about to give up when he noticed a pile of pebbles nearby. A clever idea came into his mind. He picked up the pebbles one by one and dropped them into the pot.",
            "Slowly, the water rose to the top of the pot. The thirsty crow drank the sweet water to his heart's content. He flew away happily, stronger and wiser than before.",
            "The story teaches us that where there is a will, there is a way. If we think calmly, even a difficult problem becomes easy.",
        ],
    },
    "sample-honest-woodcutter": {
        "title": "The Honest Woodcutter",
        "paras": [
            "A poor woodcutter lived in a small village near a deep forest. Every morning he walked to the forest and cut wood with his old iron axe. One day, while cutting a tree near the river, his axe slipped from his hands and fell into the water.",
            "The river was deep, and the poor man sat on the bank and began to cry. Suddenly, a beautiful water goddess rose from the river and asked him why he was weeping.",
            "She dove into the water and brought out a shining golden axe. The woodcutter shook his head and said that this was not his axe. She went down again and returned with a silver axe, but he refused that one too.",
            "At last, she held up his old iron axe, and the woodcutter smiled with joy. The goddess was pleased by his honesty and gave him all three axes as a gift.",
            "Honesty, the story tells us, is always rewarded in the end.",
        ],
    },
    "sample-golden-touch": {
        "title": "The Golden Touch",
        "paras": [
            "King Midas was one of the richest kings in the world, yet he loved gold more than anything else. One evening, a stranger granted him a single wish. Midas wished that everything he touched should turn into gold.",
            "His wish was granted at once, and he danced with joy in his palace garden. He touched a stone, and it became gold; he touched a rose, and it glittered like the sun.",
            "Soon he felt hungry and sat down at his table. The bread turned to gold the moment he lifted it, and so did the water in his cup.",
            "Then his little daughter ran into the garden, and he embraced her lovingly. To his horror, she turned into a lifeless golden statue. Midas wept and prayed to the stranger to take back the golden touch.",
            "He gladly gave away his golden gift, and his daughter came back to life. From that day, King Midas understood that gold cannot buy love or happiness.",
        ],
    },
    "sample-wind-and-sun": {
        "title": "The Wind and the Sun",
        "paras": [
            "One bright day, the Wind and the Sun saw a traveller walking down the road. He was wearing a warm coat, and the Sun suggested a friendly contest. Whoever could make the traveller take off his coat first would be called the stronger.",
            "The Wind blew first, and he blew with all his might. The harder he blew, the more tightly the traveller wrapped his coat around himself. At last, the tired Wind gave up and stopped blowing.",
            "Then the Sun came out from behind a cloud and shone gently and warmly. Very soon, the traveller felt hot and quietly took off his coat.",
            "The Sun smiled and said that gentle kindness wins where force fails. A soft word, the story shows, can do what all the shouting in the world cannot.",
        ],
    },
}


def build_pdf(path, chapter: dict) -> None:
    pdf = FPDF(format="A4")
    pdf.set_margins(24, 22, 24)
    pdf.set_auto_page_break(auto=True, margin=22)
    pdf.add_page()
    pdf.set_font("Times", "B", 24)
    pdf.cell(0, 12, chapter["title"], align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Times", "I", 11)
    pdf.set_text_color(110, 110, 110)
    pdf.cell(0, 8, BOOK, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.set_draw_color(120, 120, 120)
    pdf.line(24, pdf.get_y() + 3, 210 - 24, pdf.get_y() + 3)
    pdf.ln(10)
    pdf.set_font("Times", "", 13)
    for paragraph in chapter["paras"]:
        pdf.multi_cell(0, 7.5, paragraph)
        pdf.ln(4)
    pdf.output(str(path))


async def main() -> None:
    await ensure_indexes()
    try:
        for chapter_id, chapter in CHAPTERS.items():
            path = UPLOAD_DIR / f"{chapter_id}.pdf"
            if not path.exists():
                build_pdf(path, chapter)

            with fitz.open(path) as document:
                page_count = document.page_count

            await db.pdfs.update_one(
                {"id": chapter_id},
                {
                    "$set": {
                        "id": chapter_id,
                        "filename": f"{chapter['title']}.pdf",
                        "size_bytes": path.stat().st_size,
                        "is_sample": True,
                        "page_count": page_count,
                    },
                    "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
                },
                upsert=True,
            )
            print(f"Seeded {chapter_id} -> {path.name} ({page_count} pages)")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
