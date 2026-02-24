"use client";

import { useState } from "react";
import type { Review } from "@/types";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

type ReviewsSectionProps = {
  items: Review[];
};

const MAX_TEXT_LENGTH = 200;
const INITIAL_VISIBLE_COUNT = 3;

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className="text-accent">
      {i < rating ? "★" : "☆"}
    </span>
  ));
};

export const ReviewsSection = ({ items }: ReviewsSectionProps) => {
  const [showAll, setShowAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  if (items.length === 0) {
    return null;
  }

  const visibleItems =
    items.length > INITIAL_VISIBLE_COUNT && !showAll
      ? items.slice(0, INITIAL_VISIBLE_COUNT)
      : items;

  const toggleExpanded = (index: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);

      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  };

  return (
    <section id="reviews" className="bg-surface py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl font-bold text-center mb-12">Отзывы</h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleItems.map((item, index) => {
            const isLongText = item.text.length > MAX_TEXT_LENGTH;
            const isExpanded = expandedIds.has(index);
            const displayText =
              isLongText && !isExpanded
                ? `${item.text.slice(0, MAX_TEXT_LENGTH)}...`
                : item.text;

            return (
              <AnimateOnScroll key={index} delay={index * 150}>
                <article className="bg-white rounded-xl shadow-sm border border-border p-6">
                  <p className="font-semibold">{item.author}</p>

                  {item.rating !== undefined && (
                    <div className="mt-1">{renderStars(item.rating)}</div>
                  )}

                  <p className="mt-3 text-text">
                    {displayText}
                    {isLongText && !isExpanded && (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="text-primary cursor-pointer"
                          onClick={() => toggleExpanded(index)}
                        >
                          читать полностью
                        </button>
                      </>
                    )}
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    {item.source && (
                      <span className="text-sm bg-surface rounded-full px-2 py-0.5">
                        {item.source}
                      </span>
                    )}

                    {item.date && (
                      <span className="text-sm text-text-light">
                        {item.date}
                      </span>
                    )}
                  </div>
                </article>
              </AnimateOnScroll>
            );
          })}
        </div>

        {items.length > INITIAL_VISIBLE_COUNT && !showAll && (
          <div className="text-center mt-8">
            <button
              type="button"
              className="bg-primary text-white rounded-full px-6 py-2"
              onClick={() => setShowAll(true)}
            >
              Показать ещё
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
