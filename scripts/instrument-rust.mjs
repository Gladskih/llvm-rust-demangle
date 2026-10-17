import { transformFunction, replaceOnce, removeFunction } from "./cpp-function.mjs";

const scopes = {
  "bool Demangler::demanglePath(IsInType InType, LeaveGenericsOpen LeaveOpen)": "astPathKind(look())",
  "void Demangler::demangleImplPath(IsInType InType)": "\"ImplPath\"",
  "void Demangler::demangleGenericArg()": "\"GenericArgument\"",
  "void Demangler::demangleType()": "astTypeKind(look())",
  "void Demangler::demangleFnSig()": "\"FunctionSignature\"",
  "void Demangler::demangleDynBounds()": "\"DynBounds\"",
  "void Demangler::demangleDynTrait()": "\"DynTrait\"",
  "void Demangler::demangleOptionalBinder()": "\"Binder\"",
  "void Demangler::demangleConst()": "\"Constant\"",
  "void Demangler::demangleConstInt()": "\"IntegerData\"",
  "void Demangler::demangleConstBool()": "\"BooleanData\"",
  "void Demangler::demangleConstChar()": "\"CharacterData\"",
  "Identifier Demangler::parseIdentifier()": "\"Identifier\"",
  "uint64_t Demangler::parseOptionalBase62Number(char Tag)": "Tag == 's' ? \"Disambiguator\" : \"BinderCount\"",
  "uint64_t Demangler::parseBase62Number()": "\"Base62Number\"",
  "uint64_t Demangler::parseDecimalNumber()": "\"DecimalNumber\"",
  "uint64_t Demangler::parseHexNumber(std::string_view &HexDigits)": "\"HexNumber\"",
};

function captureRules(source) {
  for (const [signature, kind] of Object.entries(scopes)) {
    source = transformFunction(source, signature, body => {
      if (signature.includes("parseHexNumber")) body = replaceOnce(body,
        "return Value;", "Trace.field(\"value\", std::string(HexDigits));\n  return Value;");
      else if (signature.startsWith("uint64_t")) body = body.replace(/return (0|N|Value);/g,
        "return Capture.number($1);");
      return "\n  RustScope Capture(Trace, " + kind + ", Position);" + body;
    });
  }
  return source;
}

function captureSemantics(source) {
  source = replaceOnce(source, "char NS = consume();",
    "char NS = consume();\n    Trace.field(\"namespace\", std::string(1, NS));");
  source = replaceOnce(source, "return {S, Punycode};",
    "Trace.field(\"value\", std::string(S));\n  Trace.field(\"encoding\", Punycode ? \"punycode\" : \"ascii\");\n  return {S, Punycode};");
  source = replaceOnce(source, "if (parseBasicType(C, Type))\n    return printBasicType(Type);",
    "if (parseBasicType(C, Type)) {\n    Trace.kind(\"BasicType\");\n    Trace.field(\"type\", astBasicType(Type));\n    return printBasicType(Type);\n  }");
  source = replaceOnce(source, "if (parseBasicType(C, Type)) {\n    switch (Type)",
    "if (parseBasicType(C, Type)) {\n    Trace.field(\"type\", astBasicType(Type));\n    switch (Type)");
  source = replaceOnce(source, "uint64_t Backref = parseBase62Number();",
    "uint64_t Backref = parseBase62Number();\n    Trace.field(\"targetOffset\", std::to_string(Backref + 2));");
  return source;
}

function captureFunctionDetails(source) {
  source = replaceOnce(source, "if (consumeIf('U'))\n    print(\"unsafe \");",
    "if (consumeIf('U')) {\n    Trace.field(\"safety\", \"Unsafe\");\n    print(\"unsafe \");\n  }");
  source = replaceOnce(source, "if (consumeIf('C')) {\n      print(\"C\");",
    "if (consumeIf('C')) {\n      Trace.field(\"abi\", \"C\");\n      print(\"C\");");
  source = replaceOnce(source, "// Skip the unit type from the output.",
    "const size_t Unit = Trace.begin(\"BasicType\", Position + 1);\n    Trace.field(\"type\", \"Unit\");\n    Trace.finish(Unit, Position + 2);");
  source = replaceOnce(source, "while (!Error && consumeIf('p')) {",
    "while (!Error && consumeIf('p')) {\n    RustScope Binding(Trace, \"AssociatedBinding\", Position, Position + 1);");
  source = replaceOnce(source, "if (consumeIf('n'))\n    print('-');",
    "if (consumeIf('n')) {\n    Trace.field(\"sign\", \"Negative\");\n    print('-');\n  }");
  source = replaceOnce(source, "if (Dot != std::string_view::npos) {\n    print(\" (\");",
    "if (Dot != std::string_view::npos) {\n    const size_t Suffix = Trace.begin(\"Suffix\", Dot + 2);\n    Trace.field(\"value\", std::string(Mangled.substr(Dot)));\n    Trace.finish(Suffix, Mangled.size() + 2);\n    print(\" (\");");
  return source;
}

function separatePresentation(source) {
  for (const signature of ["void Demangler::print(char C)",
    "void Demangler::print(std::string_view S)", "void Demangler::printDecimalNumber(uint64_t N)",
    "void Demangler::printBasicType(BasicType Type)"]) {
    source = transformFunction(source, signature,
      body => "\n  if (Rendering == Presentation::Omit) return;" + body);
  }
  return replaceOnce(source, "if (!decodePunycode(Ident.Name, Output))",
    "if (Rendering == Presentation::Omit) {\n      OutputBuffer Scratch;\n      if (!decodePunycode(Ident.Name, Scratch)) Error = true;\n      return;\n    }\n    if (!decodePunycode(Ident.Name, Output))");
}

export function instrumentRust(source, basicTypes, kinds) {
  source = removeFunction(source, "char *llvm::rustDemangle(std::string_view MangledName)");
  source = replaceOnce(source, "class Demangler {",
    "class Demangler {\n  Graph &Trace;\n  Presentation Rendering;");
  source = replaceOnce(source, "Demangler(size_t MaxRecursionLevel = 500);",
    "Demangler(Graph &Trace, Presentation Rendering, size_t MaxRecursionLevel = 500);");
  source = replaceOnce(source, "Demangler::Demangler(size_t MaxRecursionLevel)\n    : MaxRecursionLevel(MaxRecursionLevel)",
    "Demangler::Demangler(Graph &Trace, Presentation Rendering, size_t MaxRecursionLevel)\n" +
    "    : Trace(Trace), Rendering(Rendering), MaxRecursionLevel(MaxRecursionLevel)");
  source = replaceOnce(source, "class Demangler {", basicTypes + "\n" + kinds + "\nclass Demangler {");
  return "#include \"graph.h\"\n" + separatePresentation(captureFunctionDetails(
    captureSemantics(captureRules(source)))) + "\n#include \"parse-symbol.inc\"\n";
}
