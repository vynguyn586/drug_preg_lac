(() => {
  "use strict";

  const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFEzfSeK3z3bVDJGGzDbWTWe8SwnCMMtGyaPLSF0rcvSXgPEoTquIXGWgQGeMEsg/pub?gid=94806634&single=true&output=csv";

  /*
   * Mỗi trường có nhiều tên cột dự phòng.
   * Nhờ vậy website vẫn chạy khi Google Sheet dùng PNCT hoặc PNMT.
   */
  const COLUMN_ALIASES = {
    group: [
      "Nhóm thuốc",
      "Nhom thuoc"
    ],
    name: [
      "Hoạt chất",
      "Hoat chat"
    ],
    pregnancyRecommendation: [
      "Khuyến cáo đối với PNCT",
      "Khuyến cáo đối với PNMT",
      "Khuyến cáo PNCT",
      "Khuyến cáo PNMT"
    ],
    pregnancyNote: [
      "Chú thích PNCT",
      "Chú thích PNMT",
      "Lưu ý PNCT",
      "Lưu ý PNMT"
    ],
    pregnancyReference: [
      "Tài liệu tham khảo PNCT",
      "Tài liệu tham khảo PNMT",
      "Tài liệu PNCT",
      "Tài liệu PNMT"
    ],
    lactationRecommendation: [
      "Khuyến cáo đối với PNCCB",
      "Khuyến cáo PNCCB"
    ],
    lactationNote: [
      "Chú thích PNCCB",
      "Lưu ý PNCCB"
    ],
    lactationReference: [
      "Tài liệu tham khảo PNCCB",
      "Tài liệu PNCCB"
    ],
    pregnancyColor: [
      "Mã màu PNCT",
      "Mã màu PNMT"
    ],
    lactationColor: [
      "Mã màu PNCCB"
    ]
  };

  const DEFAULT_COLORS = {
    pregnancy: "#c8f2c5",
    lactation: "#c8f2c5"
  };

  const state = {
    drugs: [],
    filteredDrugs: [],
    query: "",
    group: "",
    previousScrollY: 0,
    loaded: false
  };

  const elements = {
    homePage: document.getElementById("homePage"),
    detailPage: document.getElementById("detailPage"),
    drugContainer: document.getElementById("drugContainer"),
    drugDetail: document.getElementById("drugDetail"),
    searchInput: document.getElementById("searchInput"),
    clearSearchButton: document.getElementById("clearSearchButton"),
    groupFilter: document.getElementById("groupFilter"),
    resultCount: document.getElementById("resultCount"),
    loadingState: document.getElementById("loadingState"),
    errorState: document.getElementById("errorState"),
    errorMessage: document.getElementById("errorMessage"),
    emptyState: document.getElementById("emptyState"),
    retryButton: document.getElementById("retryButton"),
    backButton: document.getElementById("backButton"),
    shareButton: document.getElementById("shareButton"),
    toast: document.getElementById("toast")
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindEvents();
    loadSheet();
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", event => {
      state.query = event.target.value;
      elements.clearSearchButton.hidden = state.query.length === 0;
      applyFilters();
    });

    elements.searchInput.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        clearSearch();
      }

      if (event.key === "Enter" && state.filteredDrugs.length > 0) {
        openDrug(state.filteredDrugs[0]);
      }
    });

    elements.clearSearchButton.addEventListener("click", clearSearch);

    elements.groupFilter.addEventListener("change", event => {
      state.group = event.target.value;
      applyFilters();
    });

    elements.retryButton.addEventListener("click", loadSheet);
    elements.backButton.addEventListener("click", goHome);
    elements.shareButton.addEventListener("click", copyCurrentUrl);

    window.addEventListener("hashchange", handleRoute);
  }

  function loadSheet() {
    showLoading();

    if (typeof Papa === "undefined") {
      showError("Thư viện đọc CSV chưa tải được. Hãy kiểm tra kết nối mạng.");
      return;
    }

    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: header => cleanHeader(header),
      complete: result => {
        if (result.errors?.length && !result.data?.length) {
          showError(result.errors[0].message || "Google Sheets trả về dữ liệu không hợp lệ.");
          return;
        }

        const normalized = result.data
          .map(normalizeDrug)
          .filter(drug => drug.name);

        state.drugs = deduplicateDrugs(normalized)
          .sort((a, b) => a.name.localeCompare(b.name, "vi"));

        state.loaded = true;
        populateGroupFilter();
        hideStates();
        applyFilters();
        handleRoute();
      },
      error: error => {
        showError(
          error?.message ||
          "Không thể kết nối với Google Sheets. Vui lòng thử tải lại."
        );
      }
    });
  }

  function normalizeDrug(row) {
    return {
      group: getByAliases(row, COLUMN_ALIASES.group),
      name: getByAliases(row, COLUMN_ALIASES.name),
      pregnancyRecommendation: getByAliases(
        row,
        COLUMN_ALIASES.pregnancyRecommendation
      ),
      pregnancyNote: getByAliases(row, COLUMN_ALIASES.pregnancyNote),
      pregnancyReference: getByAliases(
        row,
        COLUMN_ALIASES.pregnancyReference
      ),
      lactationRecommendation: getByAliases(
        row,
        COLUMN_ALIASES.lactationRecommendation
      ),
      lactationNote: getByAliases(row, COLUMN_ALIASES.lactationNote),
      lactationReference: getByAliases(
        row,
        COLUMN_ALIASES.lactationReference
      ),
      pregnancyColor: sanitizeColor(
        getByAliases(row, COLUMN_ALIASES.pregnancyColor),
        DEFAULT_COLORS.pregnancy
      ),
      lactationColor: sanitizeColor(
        getByAliases(row, COLUMN_ALIASES.lactationColor),
        DEFAULT_COLORS.lactation
      )
    };
  }

  function cleanHeader(value) {
    return String(value ?? "")
      .replace(/^\uFEFF/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getByAliases(row, aliases) {
    for (const alias of aliases) {
      const exactValue = row[cleanHeader(alias)];
      if (exactValue !== undefined && String(exactValue).trim() !== "") {
        return String(exactValue).trim();
      }
    }

    const normalizedRow = Object.entries(row).reduce((acc, [key, value]) => {
      acc[normalizeSearchText(key)] = value;
      return acc;
    }, {});

    for (const alias of aliases) {
      const value = normalizedRow[normalizeSearchText(alias)];
      if (value !== undefined && String(value).trim() !== "") {
        return String(value).trim();
      }
    }

    return "";
  }

  function deduplicateDrugs(drugs) {
    const seen = new Map();

    drugs.forEach(drug => {
      const key = normalizeSearchText(drug.name);
      const current = seen.get(key);

      if (!current) {
        seen.set(key, drug);
        return;
      }

      /*
       * Nếu Google Sheet vô tình có hai dòng cùng hoạt chất,
       * ưu tiên giữ dữ liệu không trống ở mỗi trường.
       */
      seen.set(key, {
        ...current,
        ...Object.fromEntries(
          Object.entries(drug).map(([field, value]) => [
            field,
            value || current[field]
          ])
        )
      });
    });

    return [...seen.values()];
  }

  function populateGroupFilter() {
    const groups = [...new Set(
      state.drugs
        .map(drug => drug.group)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "vi"));

    elements.groupFilter.innerHTML =
      '<option value="">Tất cả nhóm thuốc</option>';

    groups.forEach(group => {
      const option = document.createElement("option");
      option.value = group;
      option.textContent = group;
      elements.groupFilter.appendChild(option);
    });
  }

  function applyFilters() {
    if (!state.loaded) return;

    const query = normalizeSearchText(state.query);
    const selectedGroup = normalizeSearchText(state.group);

    state.filteredDrugs = state.drugs.filter(drug => {
      const matchesName =
        !query ||
        normalizeSearchText(drug.name).includes(query) ||
        normalizeSearchText(drug.group).includes(query);

      const matchesGroup =
        !selectedGroup ||
        normalizeSearchText(drug.group) === selectedGroup;

      return matchesName && matchesGroup;
    });

    renderDrugList(state.filteredDrugs);
  }

  function renderDrugList(drugs) {
    elements.drugContainer.replaceChildren();

    const hasResults = drugs.length > 0;
    elements.emptyState.hidden = hasResults;
    elements.drugContainer.hidden = !hasResults;

    elements.resultCount.textContent =
      `${drugs.length} hoạt chất` +
      (state.query || state.group ? " phù hợp" : "");

    if (!hasResults) return;

    const fragment = document.createDocumentFragment();

    drugs.forEach(drug => {
      const card = document.createElement("article");
      card.className = "drug-card";
      card.tabIndex = 0;
      card.setAttribute("role", "link");
      card.setAttribute("aria-label", `Xem thông tin ${drug.name}`);

      const name = document.createElement("h2");
      name.className = "drug-name";
      name.textContent = drug.name;

      const group = document.createElement("div");
      group.className = "category";
      group.textContent = drug.group || "Chưa phân nhóm";

      const recommendationWrap = document.createElement("div");
      recommendationWrap.className = "card-recommendations";
      recommendationWrap.append(
        createCardRecommendation(
          "Phụ nữ mang thai",
          drug.pregnancyRecommendation
        ),
        createCardRecommendation(
          "Phụ nữ cho con bú",
          drug.lactationRecommendation
        )
      );

      card.append(name, group, recommendationWrap);
      card.addEventListener("click", () => openDrug(drug));
      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDrug(drug);
        }
      });

      fragment.appendChild(card);
    });

    elements.drugContainer.appendChild(fragment);
  }

  function createCardRecommendation(labelText, content) {
    const wrap = document.createElement("div");
    wrap.className = "card-recommendation";

    const label = document.createElement("p");
    label.className = "card-recommendation__label";
    label.textContent = labelText;

    const text = document.createElement("p");
    text.className = "card-recommendation__text";
    text.textContent = content || "Chưa có thông tin";
    if (!content) {
      text.classList.add("card-recommendation__text--empty");
    }

    wrap.append(label, text);
    return wrap;
  }

  function openDrug(drug) {
    state.previousScrollY = window.scrollY;
    window.location.hash = `#/drug/${encodeURIComponent(slugify(drug.name))}`;
  }

  function handleRoute() {
    if (!state.loaded) return;

    const match = window.location.hash.match(/^#\/drug\/(.+)$/);

    if (!match) {
      showHome();
      return;
    }

    const requestedSlug = decodeURIComponent(match[1]);
    const drug = state.drugs.find(item => slugify(item.name) === requestedSlug);

    if (!drug) {
      showHome();
      showToast("Không tìm thấy hoạt chất trong dữ liệu hiện tại.");
      return;
    }

    showDetail(drug);
  }

  function showHome() {
    elements.detailPage.hidden = true;
    elements.homePage.hidden = false;
    document.title = "Thông tin thuốc trong thai kỳ và cho con bú";

    requestAnimationFrame(() => {
      window.scrollTo({
        top: state.previousScrollY,
        behavior: "auto"
      });
    });
  }

  function showDetail(drug) {
    elements.homePage.hidden = true;
    elements.detailPage.hidden = false;
    renderDetail(drug);

    document.title = `${drug.name} | Thông tin thai kỳ và cho con bú`;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function renderDetail(drug) {
    elements.drugDetail.replaceChildren();

    const header = document.createElement("header");
    header.className = "drug-detail__header";

    const title = document.createElement("h1");
    title.className = "detail-title";
    title.textContent = drug.name;

    const category = document.createElement("div");
    category.className = "detail-category";
    category.textContent = drug.group || "Chưa phân nhóm";

    header.append(title, category);

    const fragment = document.createDocumentFragment();
    fragment.append(
      header,
      createDetailSection({
        title: "Khuyến cáo đối với phụ nữ mang thai",
        content: drug.pregnancyRecommendation,
        className: "detail-section--recommendation",
        backgroundColor: drug.pregnancyColor
      }),
      createDetailSection({
        title: "Lưu ý chi tiết khi lựa chọn thuốc cho phụ nữ mang thai",
        content: drug.pregnancyNote,
        className: "detail-section--note"
      }),
      createDetailSection({
        title: "Tài liệu tham khảo đối với phụ nữ mang thai",
        content: drug.pregnancyReference,
        className: "detail-section--reference"
      }),
      createDetailSection({
        title: "Khuyến cáo đối với phụ nữ cho con bú",
        content: drug.lactationRecommendation,
        className: "detail-section--recommendation",
        backgroundColor: drug.lactationColor
      }),
      createDetailSection({
        title: "Lưu ý chi tiết khi lựa chọn thuốc cho phụ nữ cho con bú",
        content: drug.lactationNote,
        className: "detail-section--note"
      }),
      createDetailSection({
        title: "Tài liệu tham khảo đối với phụ nữ cho con bú",
        content: drug.lactationReference,
        className: "detail-section--reference"
      })
    );

    elements.drugDetail.appendChild(fragment);
  }

  function createDetailSection({
    title,
    content,
    className,
    backgroundColor
  }) {
    const section = document.createElement("section");
    section.className = `detail-section ${className || ""}`.trim();

    if (backgroundColor) {
      section.style.backgroundColor = backgroundColor;
    }

    const heading = document.createElement("h2");
    heading.className = "detail-section__title";
    heading.textContent = title;

    const body = document.createElement("div");
    body.className = "detail-section__content";

    if (content) {
      appendRichText(body, content);
    } else {
      const empty = document.createElement("p");
      empty.className = "empty-content";
      empty.textContent = "Chưa có thông tin.";
      body.appendChild(empty);
    }

    section.append(heading, body);
    return section;
  }

  function appendRichText(container, text) {
    /*
     * Không đưa trực tiếp nội dung Sheet vào innerHTML.
     * Từng đoạn và liên kết được tạo bằng DOM để hạn chế chèn mã độc.
     */
    const lines = String(text)
      .replace(/\r\n?/g, "\n")
      .split("\n");

    let currentList = null;

    lines.forEach(rawLine => {
      const line = rawLine.trim();

      if (!line) {
        currentList = null;
        return;
      }

      const bulletMatch = line.match(/^[-•–]\s*(.+)$/);

      if (bulletMatch) {
        if (!currentList) {
          currentList = document.createElement("ul");
          container.appendChild(currentList);
        }

        const item = document.createElement("li");
        appendTextWithLinks(item, bulletMatch[1]);
        currentList.appendChild(item);
        return;
      }

      currentList = null;
      const paragraph = document.createElement("p");
      appendTextWithLinks(paragraph, line);
      container.appendChild(paragraph);
    });
  }

  function appendTextWithLinks(parent, text) {
    const urlPattern = /(https?:\/\/[^\s<>"']+)/gi;
    let cursor = 0;
    let match;

    while ((match = urlPattern.exec(text)) !== null) {
      if (match.index > cursor) {
        parent.appendChild(
          document.createTextNode(text.slice(cursor, match.index))
        );
      }

      const link = document.createElement("a");
      link.href = match[0];
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = match[0];
      parent.appendChild(link);

      cursor = match.index + match[0].length;
    }

    if (cursor < text.length) {
      parent.appendChild(document.createTextNode(text.slice(cursor)));
    }
  }

  function goHome() {
    window.location.hash = "#/";
  }

  async function copyCurrentUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Đã sao chép liên kết hoạt chất.");
    } catch {
      const temporaryInput = document.createElement("input");
      temporaryInput.value = window.location.href;
      document.body.appendChild(temporaryInput);
      temporaryInput.select();
      document.execCommand("copy");
      temporaryInput.remove();
      showToast("Đã sao chép liên kết hoạt chất.");
    }
  }

  function clearSearch() {
    state.query = "";
    elements.searchInput.value = "";
    elements.clearSearchButton.hidden = true;
    applyFilters();
    elements.searchInput.focus();
  }

  function normalizeSearchText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function slugify(value) {
    return normalizeSearchText(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function sanitizeColor(value, fallback) {
    const color = String(value ?? "").trim();

    const validHex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
    const validRgb =
      /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;
    const validHsl =
      /^hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;

    return validHex.test(color) || validRgb.test(color) || validHsl.test(color)
      ? color
      : fallback;
  }

  function showLoading() {
    state.loaded = false;
    elements.loadingState.hidden = false;
    elements.errorState.hidden = true;
    elements.emptyState.hidden = true;
    elements.drugContainer.hidden = true;
    elements.resultCount.textContent = "";
  }

  function hideStates() {
    elements.loadingState.hidden = true;
    elements.errorState.hidden = true;
  }

  function showError(message) {
    state.loaded = false;
    elements.loadingState.hidden = true;
    elements.errorState.hidden = false;
    elements.emptyState.hidden = true;
    elements.drugContainer.hidden = true;
    elements.errorMessage.textContent = message;
  }

  let toastTimer;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");

    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2400);
  }
})();
