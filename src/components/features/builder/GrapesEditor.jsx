"use client";

import React, { useEffect, useRef, useState } from "react";
import grapesjs from "grapesjs";
// Domyślny preset (używamy do ładowania stylów)
import grapesjsWebpage from "grapesjs-preset-webpage";
// Dodatkowe, zaawansowane wtyczki
import grapesjsTabs from "grapesjs-tabs";
import grapesjsCustomCode from "grapesjs-custom-code";
import grapesjsTyped from "grapesjs-typed";
import grapesjsTooltip from "grapesjs-tooltip";

import { saveLandingPage } from "src/app/actions/landingPageActions";

export default function GrapesEditor() {
  const editorRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!editorRef.current) {
      // Rozpakowujemy funkcje wtyczek, ignorując "opakowanie" .default przez Webpack
      const pWebpage = grapesjsWebpage.default || grapesjsWebpage;
      const pTabs = grapesjsTabs.default || grapesjsTabs;
      const pCustomCode = grapesjsCustomCode.default || grapesjsCustomCode;
      const pTyped = grapesjsTyped.default || grapesjsTyped;
      const pTooltip = grapesjsTooltip.default || grapesjsTooltip;

      const editor = grapesjs.init({
        container: "#gjs",
        height: "85vh",
        width: "100%",
        fromElement: true,
        storageManager: false,
        
        // 1. Podajemy zaimportowane wtyczki
        plugins: [
          pWebpage,
          pTabs,
          pCustomCode,
          pTyped,
          pTooltip
        ],
        
        // 2. JAWNA KONFIGURACJA DLA EFEKTU "DEMOVILLE"
        // Konfiguracja Style Managera (prawa kolumna)
        styleManager: {
          sectors: [
            {
              name: "General",
              open: true,
              buildProps: ["float", "display", "position", "top", "right", "bottom", "left", "width", "height", "max-width", "min-height", "margin", "padding"],
            },
            {
              name: "Flex",
              open: false,
              buildProps: ["flex-direction", "flex-wrap", "justify-content", "align-items", "align-content", "order", "flex-basis", "flex-grow", "flex-shrink", "align-self"],
            },
            {
              name: "Typography",
              open: false,
              buildProps: ["font-family", "font-size", "font-weight", "letter-spacing", "color", "line-height", "text-align", "text-shadow"],
            },
            {
              name: "Decorations",
              open: false,
              buildProps: ["border-collapse", "border-spacing", "background-color", "border-radius", "border", "background", "box-shadow"],
            },
            {
              name: "Extra",
              open: false,
              buildProps: ["opacity", "transition", "transform", "z-index"],
            },
          ],
        },

        // Konfiguracja Opcji dla Wtyczek (aby jawniewstrzyknąć bloki i kategorie)
        pluginsOpts: {
          [pWebpage]: {
            // Jawnie włączamy potężne bloki Flexbox Columns
            blocksBasicOpts: { flexGrid: true },
            // Jawnie włączamy CAŁĄ kategorię Formularzy (Forms)
            formsOpts: true,
            // Navbar i countdown
            navbarOpts: true,
            countdownOpts: true,
          },
          // Dodatkowe wtyczki same wstrzykują bloki do kategorii "Extra"
          [pTabs]: {},
          [pCustomCode]: {},
          [pTyped]: {},
          [pTooltip]: {}
        },
      });

      setEditorInstance(editor);
      editorRef.current = editor;

      // Opcjonalnie: Ustawiamy domyślny język UI na polski (jeśli GrapesJS go załaduje)
      // editor.I18n.setLocale('pl');
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  const handleSave = async () => {
    if (!editorInstance) return;
    setIsSaving(true);

    const htmlData = editorInstance.getHtml();
    const cssData = editorInstance.getCss();

    const result = await saveLandingPage({
      title: "PZPP Zaawansowana Kampania",
      slug: `promo-studio-${Math.floor(Math.random() * 10000)}`,
      htmlData,
      cssData,
    });

    if (result.success) {
      alert("Landing Page pomyślnie zapisany w bazie PZPP!");
    } else {
      alert(result.error);
    }
    
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col w-full border border-gray-300 rounded-lg overflow-hidden shadow-2xl bg-white min-h-[90vh]">
      {/* ⚠️ Workaround z Turn 13 - dociągamy style kreatora z ominięciem Next.js ⚠️ */}
      <link rel="stylesheet" href="https://unpkg.com/grapesjs/dist/css/grapes.min.css" />
      {/* FontAwesome dla piktogramów */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
      
      {/* Nasz własny pasek PZPP do zapisu na serwerze (zielony) */}
      <div className="bg-gray-800 p-3 flex justify-between items-center text-white z-50 relative border-b border-gray-700">
        <h2 className="font-bold">Kreator Landing Page PZPP</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg font-bold transition disabled:opacity-50"
        >
          {isSaving ? "Zapisywanie w bazie..." : "💾 Zapisz Stronę w Bazie PZPP"}
        </button>
      </div>
      
      {/* Czysty kontener, w którym GrapesJS samodzielnie wybuduje swój pełny interfejs Demoville */}
      <div id="gjs" className="gjs-editor-cont">
        <h1>PZPP GrapesJS Frankenstein</h1>
        <p>Przeciągnij bloki z prawego panelu. Powinieneś mieć tu teraz wszystko (Section, Columns, Forms)!</p>
      </div>
    </div>
  );
}