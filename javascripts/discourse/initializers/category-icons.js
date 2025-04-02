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
    withPluginApi("0.8.31", (api) => {
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
      
      // Handle parent categories in search results
      this.handleSearchResultCategories(api);

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
  
  handleSearchResultCategories(api) {
    // Get access to the site data for category lookups
    const site = api.container.lookup("service:site");
    const router = api.container.lookup("service:router");
    let isHomepage = false;
    
    // Helper function to add parent category to a badge
    const addParentBadge = (badge, parentCategoryId) => {
      // Skip if already processed
      if (badge.parentNode.querySelector(".parent-category-badge")) return;
      
      // Find parent category by ID
      const parentCategory = site.categories.find(c => c.id === parseInt(parentCategoryId));
      if (!parentCategory) return;
      
      // Create parent badge
      const parentBadge = document.createElement("a");
      parentBadge.href = `/c/${parentCategory.slug}/${parentCategory.id}`;
      parentBadge.className = "badge-category__wrapper parent-category-badge";
      
      const parentSpan = document.createElement("span");
      parentSpan.className = "badge-category";
      parentSpan.setAttribute("data-category-id", parentCategoryId);
      parentSpan.setAttribute("data-drop-close", "true");
      
      const iconItem = this.getIconItem(settings.category_icon_list.split("|"), parentCategory.slug);
      
      if (iconItem) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "badge-category__icon";
        if (iconItem[2]) {
          iconSpan.style.color = iconItem[2];
        }
        iconSpan.innerHTML = iconHTML(iconItem[1]);
        parentSpan.appendChild(iconSpan);
      }
      
      const nameSpan = document.createElement("span");
      nameSpan.className = "badge-category__name";
      nameSpan.dir = "ltr";
      nameSpan.textContent = parentCategory.name;
      
      parentSpan.appendChild(nameSpan);
      parentBadge.appendChild(parentSpan);
      
      // Insert before the child category badge
      badge.parentNode.insertBefore(parentBadge, badge.parentNode.firstChild);
    };
    
    // Process a specific search menu
    const processSearchMenu = (searchMenu) => {
      if (!searchMenu) return;
      
      // Find all parent category badges within this specific search menu
      const badges = searchMenu.querySelectorAll(".badge-category.--has-parent");
      
      badges.forEach(badge => {
        // Get parent ID directly from data attribute
        const parentCategoryId = badge.getAttribute("data-parent-category-id");
        if (parentCategoryId) {
          addParentBadge(badge, parentCategoryId);
        }
      });
      
      // Debug output for homepage
      if (isHomepage) {
        console.log("Processed search menu", searchMenu);
        console.log("Found badges:", badges.length);
      }
    };
    
    // Special handling for homepage search
    const specialHomepageHandler = () => {
      // Only run this on the homepage
      if (!isHomepage) return;
      
      // Target all possible search containers
      const searchContainers = [
        document.querySelector(".search-menu"),
        document.querySelector(".menu-panel"),
        document.querySelector(".results"),
        document.querySelector(".search-results"),
        document.querySelector(".search-menu-results"),
        document.querySelector(".panel-body")
      ].filter(el => el); // Remove null elements
      
      // Process each container
      searchContainers.forEach(container => {
        // Force reprocessing of search results
        processSearchMenu(container);
        
        // Also look for nested containers
        const nestedContainers = container.querySelectorAll(".results, .search-results, .panel-body-contents");
        nestedContainers.forEach(nested => processSearchMenu(nested));
      });
    };
    
    // Process all badges on the page
    const processAllBadges = () => {
      document.querySelectorAll(".badge-category.--has-parent").forEach(badge => {
        const parentCategoryId = badge.getAttribute("data-parent-category-id");
        if (parentCategoryId) {
          addParentBadge(badge, parentCategoryId);
        }
      });
    };
    
    // Check if we're on the homepage
    const checkIfHomepage = () => {
      isHomepage = router.currentRouteName === "discovery.index" || 
                  document.body.classList.contains("navigation-topics") ||
                  window.location.pathname === "/" ||
                  window.location.pathname === "";
      
      // Extra aggressive handling for homepage
      if (isHomepage) {
        // Run our special handler on a timer
        setTimeout(specialHomepageHandler, 300);
        setTimeout(specialHomepageHandler, 600);
        setTimeout(specialHomepageHandler, 1000);
        
        // Also set up an interval for the homepage
        if (!window.homepageInterval) {
          window.homepageInterval = setInterval(() => {
            if (document.querySelector(".search-menu") && 
                document.querySelector(".search-menu").querySelector(".badge-category.--has-parent")) {
              specialHomepageHandler();
            }
          }, 500);
          
          // Clear after 5 seconds to avoid performance issues
          setTimeout(() => {
            clearInterval(window.homepageInterval);
            window.homepageInterval = null;
          }, 5000);
        }
      }
    };
    
    // Set up a mutation observer for all changes
    const observer = new MutationObserver(() => {
      // Check if we're on homepage
      checkIfHomepage();
      
      // Process all badges
      processAllBadges();
      
      // Extra processing for search menus
      document.querySelectorAll(".search-menu, .results, .search-results").forEach(menu => {
        processSearchMenu(menu);
      });
    });
    
    // Start observing the entire document
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-parent-category-id"]
    });
    
    // Process on page change
    api.onPageChange(() => {
      checkIfHomepage();
      setTimeout(processAllBadges, 100);
      setTimeout(specialHomepageHandler, 300);
    });
    
    // Process on search click with multiple attempts
    document.addEventListener("click", event => {
      if (event.target.closest(".search-dropdown") || 
          event.target.closest(".search-button") || 
          event.target.closest(".search-icon") ||
          event.target.closest(".header-dropdown-toggle.search-dropdown") ||
          event.target.closest("[data-element='search-menu-trigger']")) {
        
        // Multiple attempts with increasing delays
        setTimeout(processAllBadges, 200);
        setTimeout(processAllBadges, 400);
        setTimeout(processAllBadges, 800);
        
        // Check if we're on homepage and do extra processing
        checkIfHomepage();
      }
    });
    
    // Initial processing
    checkIfHomepage();
    processAllBadges();
  },
  
  getIconItem(categoryThemeList, categorySlug) {
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
};
