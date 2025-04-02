// File: javascripts/discourse/initializers/category-icons-with-parent.js
import { get } from "@ember/object";
import categoriesBoxes from "discourse/components/categories-boxes";
import categoriesBoxesWithTopics from "discourse/components/categories-boxes-with-topics";
import categoryTitleLink from "discourse/components/category-title-link";
import getURL from "discourse/lib/get-url";
import CategoryHashtagType from "discourse/lib/hashtag-types/category";
import { helperContext } from "discourse/lib/helpers";
import { iconHTML, iconNode } from "discourse/lib/icon-library";
import { withPluginApi } from "discourse/lib/plugin-api";
import { isRTL } from "discourse/lib/text-direction";
import { escapeExpression } from "discourse/lib/utilities";
import categoryVariables from "discourse/helpers/category-variables";
import Category from "discourse/models/category";
import { h } from "virtual-dom";
import { i18n } from "discourse-i18n";

class CategoryHashtagTypeWithIcon extends CategoryHashtagType {
  constructor(dict, owner) {
    super(owner);
    this.dict = dict;
  }

  generateIconHTML(hashtag) {
    const opt = this.dict[hashtag.id];
    if (opt) {
      const newIcon = document.createElement("span");
      newIcon.classList.add("hashtag-category-icon");
      newIcon.innerHTML = iconHTML(opt.icon);
      newIcon.style.color = opt.color;
      return newIcon.outerHTML;
    } else {
      return super.generateIconHTML(hashtag);
    }
  }
}

export default {
  name: "category-icons-with-parent",

  initialize(owner) {
    withPluginApi("0.8.31", api => {
      let categoryThemeList = settings.category_icon_list.split("|");
      let lockIcon = settings.category_lock_icon || "lock";

      categoryTitleLink.reopen({
        lockIcon,
      });

      categoriesBoxes.reopen({
        lockIcon,
      });

      categoriesBoxesWithTopics.reopen({
        lockIcon,
      });
      
      function getIconItem(categorySlug) {
        if (!categorySlug) {
          return;
        }

        let categoryThemeItem = categoryThemeList.find((str) =>
          str.indexOf(",") > -1
            ? categorySlug.indexOf(str.substr(0, str.indexOf(","))) > -1
            : ""
        );

        if (categoryThemeItem) {
          let iconItem = categoryThemeItem.split(",");
          // Test partial/exact match
          if (iconItem[3] === "partial") {
            return iconItem;
          } else if (iconItem[0] === categorySlug) {
            return iconItem;
          }
        }
      }

      function buildTopicCount(count) {
        return `<span class="topic-count" aria-label="${i18n(
          "category_row.topic_count",
          { count }
        )}">&times; ${count}</span>`;
      }

      function renderParentCategory(parentCat, opts) {
        let siteSettings = helperContext().siteSettings;
        let descriptionText = escapeExpression(get(parentCat, "description_text"));
        let restricted = get(parentCat, "read_restricted");
        let url = opts.url
          ? opts.url
          : getURL(`/c/${Category.slugFor(parentCat)}/${get(parentCat, "id")}`);
        let href = opts.link === false ? "" : url;
        let tagName = opts.link === false || opts.link === "false" ? "span" : "a";
        let extraClasses = opts.extraClasses ? " " + opts.extraClasses : "";
        let style = `${categoryVariables(parentCat)}`;
        let html = "";
        let categoryDir = "";
        let dataAttributes = `data-category-id="${get(parentCat, "id")}"`;

        // Add custom category icon for parent
        let parentIconItem = getIconItem(parentCat.slug);

        let classNames = `badge-category ${parentIconItem ? "--has-icon" : ""}`;
        if (restricted) {
          classNames += " restricted";
        }

        html += `<span
          ${dataAttributes}      
          data-drop-close="true"
          class="${classNames}"
          ${
            opts.previewColor
              ? `style="--category-badge-color: #${parentCat.color}"`
              : ""
          }
          ${descriptionText ? 'title="' + descriptionText + '" ' : ""}
        >`;

        if (parentIconItem) {
          let itemColor = parentIconItem[2] ? `style="color: ${parentIconItem[2]}"` : "";
          let itemIcon = parentIconItem[1] !== "" ? iconHTML(parentIconItem[1]) : "";
          html += `<span ${itemColor} class="badge-category__icon">${itemIcon}</span>`;
        }

        let categoryName = escapeExpression(get(parentCat, "name"));

        if (siteSettings.support_mixed_text_direction) {
          categoryDir = isRTL(categoryName) ? 'dir="rtl"' : 'dir="ltr"';
        }

        if (restricted) {
          html += iconHTML(lockIcon);
        }
        html += `<span class="badge-category__name" ${categoryDir}>${categoryName}</span>`;
        html += "</span>";

        if (href) {
          href = ` href="${href}" `;
        }

        return `<${tagName} class="badge-category__wrapper parent-category-badge ${extraClasses}" ${
          style.length > 0 ? `style="${style}"` : ""
        } ${href}>${html}</${tagName}>`;
      }

      function categoryIconsRenderer(category, opts) {
        // Skip if on the main category page
        const router = api.container.lookup("service:router");
        const skipParentDisplay = router.currentRouteName === "discovery.categories";

        let siteSettings = helperContext().siteSettings;
        let descriptionText = escapeExpression(get(category, "description_text"));
        let restricted = get(category, "read_restricted");
        let url = opts.url
          ? opts.url
          : getURL(`/c/${Category.slugFor(category)}/${get(category, "id")}`);
        let href = opts.link === false ? "" : url;
        let tagName = opts.link === false || opts.link === "false" ? "span" : "a";
        let extraClasses = opts.extraClasses ? " " + opts.extraClasses : "";
        let html = "";
        let parentCat = null;
        let categoryDir = "";
        let dataAttributes = category ? `data-category-id="${get(category, "id")}"` : "";

        // Add custom category icon from theme settings
        let iconItem = getIconItem(category.slug);

        if (!opts.hideParent) {
          parentCat = Category.findById(get(category, "parent_category_id"));
        }

        let classNames = `badge-category ${iconItem ? "--has-icon" : ""}`;
        if (restricted) {
          classNames += " restricted";
        }

        if (parentCat && !skipParentDisplay) {
          classNames += ` child-category`;
        } else {
          classNames += ` ${parentCat ? "--has-parent" : ""}`;
        }

        html += `<span 
          ${dataAttributes} 
          data-drop-close="true" 
          class="${classNames}" 
          ${descriptionText ? 'title="' + descriptionText + '" ' : ""}
        >`;

        if (iconItem) {
          let itemColor = iconItem[2] ? `style="color: ${iconItem[2]}"` : "";
          let itemIcon = iconItem[1] !== "" ? iconHTML(iconItem[1]) : "";
          html += `<span ${itemColor} class="badge-category__icon">${itemIcon}</span>`;
        }

        let categoryName = escapeExpression(get(category, "name"));

        if (siteSettings.support_mixed_text_direction) {
          categoryDir = isRTL(categoryName) ? 'dir="rtl"' : 'dir="ltr"';
        }

        if (restricted) {
          html += iconHTML(lockIcon);
        }
        html += `<span class="badge-category__name" ${categoryDir}>${categoryName}</span>`;
        html += "</span>";

        if (opts.topicCount) {
          html += buildTopicCount(opts.topicCount);
        }

        if (href) {
          href = ` href="${href}" `;
        }

        let afterBadgeWrapper = "";

        if (opts.plusSubcategories && opts.lastSubcategory) {
          afterBadgeWrapper += `<span class="plus-subcategories">
            ${i18n("category_row.plus_subcategories", {
              count: opts.plusSubcategories,
            })}
            </span>`;
        }

        const categoryWrapper = `<${tagName} class="badge-category__wrapper ${extraClasses}" ${href}>${html}</${tagName}>${afterBadgeWrapper}`;
        
        // Display parent category breadcrumb except on main categories page
        if (parentCat && !skipParentDisplay && !opts.hideParent) {
          return renderParentCategory(parentCat, opts) + categoryWrapper.replace("--has-parent", "");
        } else {
          return categoryWrapper;
        }
      }

      api.replaceCategoryLinkRenderer(categoryIconsRenderer);

      api.createWidget("category-icon", {
        tagName: "div.category-icon-widget",
        html(attrs) {
          let iconItem = getIconItem(attrs.category.slug);
          if (iconItem) {
            let itemColor = iconItem[2]
              ? iconItem[2].match(/categoryColo(u*)r/g)
                ? `color: #${attrs.category.color}`
                : `color: ${iconItem[2]}`
              : "";
            let itemIcon = iconItem[1] !== "" ? iconNode(iconItem[1]) : "";
            return h("span.category-icon", { style: itemColor }, itemIcon);
          }
        },
      });
      
      // Handle search results separately - simpler approach
      this.setupSearchResultsHandler(api);

      function getIconItem(categorySlug) {
        if (!categorySlug) {
          return;
        }

        let categoryThemeItem = categoryThemeList.find((str) =>
          str.indexOf(",") > -1
            ? categorySlug.indexOf(str.substr(0, str.indexOf(","))) > -1
            : ""
        );

        if (categoryThemeItem) {
          let iconItem = categoryThemeItem.split(",");
          // Test partial/exact match
          if (iconItem[3] === "partial") {
            return iconItem;
          } else if (iconItem[0] === categorySlug) {
            return iconItem;
          }
        }
      }

      function buildTopicCount(count) {
        return `<span class="topic-count" aria-label="${i18n(
          "category_row.topic_count",
          { count }
        )}">&times; ${count}</span>`;
      }

      function renderParentCategory(parentCat, opts) {
        let siteSettings = helperContext().siteSettings;
        let descriptionText = escapeExpression(get(parentCat, "description_text"));
        let restricted = get(parentCat, "read_restricted");
        let url = opts.url
          ? opts.url
          : getURL(`/c/${Category.slugFor(parentCat)}/${get(parentCat, "id")}`);
        let href = opts.link === false ? "" : url;
        let tagName = opts.link === false || opts.link === "false" ? "span" : "a";
        let extraClasses = opts.extraClasses ? " " + opts.extraClasses : "";
        let style = `${categoryVariables(parentCat)}`;
        let html = "";
        let categoryDir = "";
        let dataAttributes = `data-category-id="${get(parentCat, "id")}"`;

        // Add custom category icon for parent
        let parentIconItem = getIconItem(parentCat.slug);

        let classNames = `badge-category ${parentIconItem ? "--has-icon" : ""}`;
        if (restricted) {
          classNames += " restricted";
        }

        html += `<span
          ${dataAttributes}      
          data-drop-close="true"
          class="${classNames}"
          ${
            opts.previewColor
              ? `style="--category-badge-color: #${parentCat.color}"`
              : ""
          }
          ${descriptionText ? 'title="' + descriptionText + '" ' : ""}
        >`;

        if (parentIconItem) {
          let itemColor = parentIconItem[2] ? `style="color: ${parentIconItem[2]}"` : "";
          let itemIcon = parentIconItem[1] !== "" ? iconHTML(parentIconItem[1]) : "";
          html += `<span ${itemColor} class="badge-category__icon">${itemIcon}</span>`;
        }

        let categoryName = escapeExpression(get(parentCat, "name"));

        if (siteSettings.support_mixed_text_direction) {
          categoryDir = isRTL(categoryName) ? 'dir="rtl"' : 'dir="ltr"';
        }

        if (restricted) {
          html += iconHTML(lockIcon);
        }
        html += `<span class="badge-category__name" ${categoryDir}>${categoryName}</span>`;
        html += "</span>";

        if (href) {
          href = ` href="${href}" `;
        }

        return `<${tagName} class="badge-category__wrapper parent-category-badge ${extraClasses}" ${
          style.length > 0 ? `style="${style}"` : ""
        } ${href}>${html}</${tagName}>`;
      }

      function categoryIconsRenderer(category, opts) {
        // Skip if on the main category page
        const router = api.container.lookup("service:router");
        const skipParentDisplay = router.currentRouteName === "discovery.categories";

        let siteSettings = helperContext().siteSettings;
        let descriptionText = escapeExpression(get(category, "description_text"));
        let restricted = get(category, "read_restricted");
        let url = opts.url
          ? opts.url
          : getURL(`/c/${Category.slugFor(category)}/${get(category, "id")}`);
        let href = opts.link === false ? "" : url;
        let tagName = opts.link === false || opts.link === "false" ? "span" : "a";
        let extraClasses = opts.extraClasses ? " " + opts.extraClasses : "";
        let html = "";
        let parentCat = null;
        let categoryDir = "";
        let dataAttributes = category ? `data-category-id="${get(category, "id")}"` : "";

        // Add custom category icon from theme settings
        let iconItem = getIconItem(category.slug);

        if (!opts.hideParent) {
          parentCat = Category.findById(get(category, "parent_category_id"));
        }

        let classNames = `badge-category ${iconItem ? "--has-icon" : ""}`;
        if (restricted) {
          classNames += " restricted";
        }

        if (parentCat && !skipParentDisplay) {
          classNames += ` child-category`;
        } else {
          classNames += ` ${parentCat ? "--has-parent" : ""}`;
        }

        html += `<span 
          ${dataAttributes} 
          data-drop-close="true" 
          class="${classNames}" 
          ${descriptionText ? 'title="' + descriptionText + '" ' : ""}
        >`;

        if (iconItem) {
          let itemColor = iconItem[2] ? `style="color: ${iconItem[2]}"` : "";
          let itemIcon = iconItem[1] !== "" ? iconHTML(iconItem[1]) : "";
          html += `<span ${itemColor} class="badge-category__icon">${itemIcon}</span>`;
        }

        let categoryName = escapeExpression(get(category, "name"));

        if (siteSettings.support_mixed_text_direction) {
          categoryDir = isRTL(categoryName) ? 'dir="rtl"' : 'dir="ltr"';
        }

        if (restricted) {
          html += iconHTML(lockIcon);
        }
        html += `<span class="badge-category__name" ${categoryDir}>${categoryName}</span>`;
        html += "</span>";

        if (opts.topicCount) {
          html += buildTopicCount(opts.topicCount);
        }

        if (href) {
          href = ` href="${href}" `;
        }

        let afterBadgeWrapper = "";

        if (opts.plusSubcategories && opts.lastSubcategory) {
          afterBadgeWrapper += `<span class="plus-subcategories">
            ${i18n("category_row.plus_subcategories", {
              count: opts.plusSubcategories,
            })}
            </span>`;
        }

        const categoryWrapper = `<${tagName} class="badge-category__wrapper ${extraClasses}" ${href}>${html}</${tagName}>${afterBadgeWrapper}`;
        
        // Display parent category breadcrumb except on main categories page
        if (parentCat && !skipParentDisplay && !opts.hideParent) {
          return renderParentCategory(parentCat, opts) + categoryWrapper.replace("--has-parent", "");
        } else {
          return categoryWrapper;
        }
      }

      api.replaceCategoryLinkRenderer(categoryIconsRenderer);

      api.createWidget("category-icon", {
        tagName: "div.category-icon-widget",
        html(attrs) {
          let iconItem = getIconItem(attrs.category.slug);
          if (iconItem) {
            let itemColor = iconItem[2]
              ? iconItem[2].match(/categoryColo(u*)r/g)
                ? `color: #${attrs.category.color}`
                : `color: ${iconItem[2]}`
              : "";
            let itemIcon = iconItem[1] !== "" ? iconNode(iconItem[1]) : "";
            return h("span.category-icon", { style: itemColor }, itemIcon);
          }
        },
      });

      if (api.registerCustomCategorySectionLinkLockIcon) {
        api.registerCustomCategorySectionLinkLockIcon(lockIcon);
      }

      if (api.registerCustomCategorySectionLinkPrefix) {
        const site = api.container.lookup("service:site");

        categoryThemeList.forEach((str) => {
          const [slug, icon, color, match] = str.split(",");

          if (slug && icon) {
            const category = site.categories.find((cat) => {
              if (match === "partial") {
                return cat.slug.toLowerCase().includes(slug.toLowerCase());
              } else {
                return cat.slug.toLowerCase() === slug.toLowerCase();
              }
            });

            if (category) {
              const opts = {
                categoryId: category.id,
                prefixType: "icon",
                prefixValue: icon,
                prefixColor: color,
              };

              // Fix for legacy color declaration
              if (color?.match(/categoryColo(u*)r/g)) {
                opts.prefixColor = category.color;
              }

              api.registerCustomCategorySectionLinkPrefix(opts);
            }
          }
        });
      }

      if (api.registerHashtagType) {
        const site = api.container.lookup("service:site");
        const dict = {};
        for (const str of categoryThemeList) {
          let [slug, icon, color, match] = str.split(",");
          if (slug && icon) {
            slug = slug.toLowerCase();
            for (const cat of site.categories) {
              const catSlug = cat.slug.toLowerCase();
              if (
                match === "partial" ? !catSlug.includes(slug) : catSlug !== slug
              ) {
                continue;
              }
              const opts = {
                icon,
                color,
              };
              if (!color || color?.match(/categoryColo(u*)r/g)) {
                opts.color = `#${cat.color}`;
              }
              dict[cat.id] = opts;
            }
          }
        }
        api.registerHashtagType(
          "category",
          new CategoryHashtagTypeWithIcon(dict, owner)
        );
      }
    });
  },
  
  setupSearchResultsHandler(api) {
    // Get site data for categories
    const site = api.container.lookup("service:site");
    
    // Process a single badge
    function processBadge(badge) {
      // Skip if already processed or no parent
      if (!badge || !badge.classList || !badge.classList.contains('--has-parent')) return;
      
      // Check if this badge already has a parent badge added
      let current = badge;
      let processed = false;
      
      // Look directly upward in parent node to find existing badges
      const badgeWrapper = badge.closest('.badge-category__wrapper');
      if (badgeWrapper) {
        let prev = badgeWrapper.previousElementSibling;
        if (prev && prev.classList && prev.classList.contains('parent-category-badge')) {
          processed = true;
        }
      }
      
      if (processed) return;
      
      // Get parent category ID
      const parentId = badge.getAttribute('data-parent-category-id');
      if (!parentId) return;
      
      // Find parent category
      const parentCategory = site.categories.find(c => c.id === parseInt(parentId, 10));
      if (!parentCategory) return;
      
      // Create parent badge
      const parentWrapper = document.createElement('a');
      parentWrapper.className = 'badge-category__wrapper parent-category-badge';
      parentWrapper.href = `/c/${parentCategory.slug}/${parentCategory.id}`;
      
      const parentBadge = document.createElement('span');
      parentBadge.className = 'badge-category';
      parentBadge.setAttribute('data-category-id', parentId);
      parentBadge.setAttribute('data-drop-close', 'true');
      
      // Check for icon
      const categoryThemeList = settings.category_icon_list.split("|");
      const iconMatch = categoryThemeList.find(str => {
        if (!str || !str.includes(',')) return false;
        const [slug, _, __, match] = str.split(',');
        if (match === 'partial') {
          return parentCategory.slug.includes(slug);
        } else {
          return parentCategory.slug === slug;
        }
      });
      
      if (iconMatch) {
        const [_, icon, color] = iconMatch.split(',');
        if (icon) {
          const iconSpan = document.createElement('span');
          iconSpan.className = 'badge-category__icon';
          if (color) {
            iconSpan.style.color = color;
          }
          iconSpan.innerHTML = iconHTML(icon);
          parentBadge.appendChild(iconSpan);
        }
      }
      
      // Add category name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'badge-category__name';
      nameSpan.textContent = parentCategory.name;
      nameSpan.dir = 'ltr';
      
      parentBadge.appendChild(nameSpan);
      parentWrapper.appendChild(parentBadge);
      
      // Try multiple insertion strategies
      if (badgeWrapper) {
        // Standard approach - insert before badge wrapper
        badgeWrapper.parentNode.insertBefore(parentWrapper, badgeWrapper);
      } else {
        // Fallback - get closest container and insert before badge
        const secondLine = badge.closest('.second-line');
        if (secondLine) {
          secondLine.insertBefore(parentWrapper, secondLine.firstChild);
        } else {
          badge.parentNode.insertBefore(parentWrapper, badge);
        }
      }
    }
    
    // Process all badges matching selector
    function processAllBadges() {
      document.querySelectorAll('.badge-category.--has-parent').forEach(processBadge);
    }
    
    // Special homepage handler
    function processHomepageSearch() {
      // Find all possible parent nodes for search results on homepage
      const containers = [
        '.navigation-topics .search-menu',
        '.ember-application .search-menu',
        '.discovery-index .search-menu',
        '[class*="discovery-"] .search-menu',
        '#main-outlet .search-menu',
        '.search-menu'
      ];
      
      containers.forEach(selector => {
        const menu = document.querySelector(selector);
        if (menu) {
          // Find all badges within this container
          const badges = menu.querySelectorAll('.badge-category.--has-parent');
          badges.forEach(processBadge);
        }
      });
    }
    
    // Create a dedicated observer for badge elements
    const badgeObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            // If the node itself is a badge with parent
            if (node.nodeType === 1 && node.classList && 
                node.classList.contains('badge-category') && 
                node.classList.contains('--has-parent')) {
              processBadge(node);
            }
            // If it's an element that might contain badges
            else if (node.nodeType === 1 && node.querySelectorAll) {
              const badges = node.querySelectorAll('.badge-category.--has-parent');
              if (badges.length) {
                badges.forEach(processBadge);
              }
            }
          });
        }
      });
    });
    
    // Observe entire document
    badgeObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Watch for search menu opening
    document.addEventListener('click', event => {
      if (event.target.closest('.search-dropdown') || 
          event.target.closest('.search-icon') ||
          event.target.closest('.search-button') ||
          event.target.matches('[data-element="search-menu-trigger"]')) {
        
        // First process after a short delay
        setTimeout(() => {
          processAllBadges();
          processHomepageSearch(); // Special homepage processing
        }, 200);
        
        // Also check again after longer delay
        setTimeout(() => {
          processAllBadges();
          processHomepageSearch();
        }, 600);
      }
    });
    
    // Setup periodic checking during page load
    let checkCount = 0;
    const interval = setInterval(() => {
      processAllBadges();
      processHomepageSearch();
      checkCount++;
      if (checkCount >= 10) {
        clearInterval(interval);
      }
    }, 500);
    
    // Run on page change
    api.onPageChange(() => {
      setTimeout(() => {
        processAllBadges();
        processHomepageSearch();
      }, 100);
    });
    
    // Run on load
    setTimeout(() => {
      processAllBadges();
      processHomepageSearch();
    }, 100);
  },
  

};
