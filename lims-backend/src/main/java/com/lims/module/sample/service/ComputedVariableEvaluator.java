package com.lims.module.sample.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Slf4j
public class ComputedVariableEvaluator {

    private final ExpressionParser parser = new SpelExpressionParser();
    private static final Pattern AGG_PATTERN = Pattern.compile("(AVG|SUM|MIN|MAX|COUNT)\\s*\\(\\s*([a-zA-Z0-9_]+)\\.\\*\\.([a-zA-Z0-9_]+)\\s*\\)");
    private static final Pattern IF_PATTERN = Pattern.compile("IF\\s*\\(");
    private static final Pattern ROUND_PATTERN = Pattern.compile("ROUND\\s*\\(");

    public String evaluate(String expression, String format, Map<String, String> resolutionMap) {
        if (expression == null || expression.trim().isEmpty()) return "";

        try {
            StandardEvaluationContext context = new StandardEvaluationContext();
            
            // Register math functions
            context.registerFunction("ROUND", ComputedVariableEvaluator.class.getDeclaredMethod("round", Double.class, Integer.class));
            
            // Pre-process wildcard aggregations: AVG(results.*.mass) -> avg('results.mass', #map)
            String processedExpr = processAggregations(expression);
            
            // Pre-process IF(cond, true, false) -> (cond ? true : false)
            processedExpr = processIfStatements(processedExpr);
            
            context.setVariable("map", resolutionMap);
            context.registerFunction("avg", ComputedVariableEvaluator.class.getDeclaredMethod("avg", String.class, Map.class));
            context.registerFunction("sum", ComputedVariableEvaluator.class.getDeclaredMethod("sum", String.class, Map.class));
            context.registerFunction("min", ComputedVariableEvaluator.class.getDeclaredMethod("min", String.class, Map.class));
            context.registerFunction("max", ComputedVariableEvaluator.class.getDeclaredMethod("max", String.class, Map.class));
            context.registerFunction("count", ComputedVariableEvaluator.class.getDeclaredMethod("count", String.class, Map.class));

            // Replace scalar variables: results.mass.0 -> #map['results.mass.0']
            processedExpr = processScalarVariables(processedExpr, resolutionMap);

            Object result = parser.parseExpression(processedExpr).getValue(context);
            
            if (result == null) return "";
            
            if (format != null && !format.trim().isEmpty() && result instanceof Number) {
                return String.format(format, ((Number) result).doubleValue());
            }
            return String.valueOf(result);

        } catch (Exception e) {
            log.warn("Failed to evaluate computed variable expression '{}': {}", expression, e.getMessage());
            return "";
        }
    }

    private String processAggregations(String expr) {
        Matcher m = AGG_PATTERN.matcher(expr);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String func = m.group(1).toLowerCase();
            String section = m.group(2);
            String field = m.group(3);
            m.appendReplacement(sb, "#" + func + "('" + section + "." + field + "', #map)");
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private String processScalarVariables(String expr, Map<String, String> map) {
        String res = expr;
        for (String key : map.keySet()) {
            if (!key.startsWith("count:") && !key.startsWith("header.")) {
                res = res.replaceAll("\\b" + Pattern.quote(key) + "\\b", "T(java.lang.Double).parseDouble(#map['" + key + "']?:'0')");
            }
        }
        for (String key : map.keySet()) {
            if (key.startsWith("header.")) {
                res = res.replaceAll("\\b" + Pattern.quote(key) + "\\b", "#map['" + key + "']");
            }
        }
        return res;
    }

    private String processIfStatements(String expr) {
        Matcher m = Pattern.compile("IF\\s*\\(([^,]+),([^,]+),([^)]+)\\)").matcher(expr);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(sb, "(" + m.group(1) + " ? " + m.group(2) + " : " + m.group(3) + ")");
        }
        m.appendTail(sb);
        return sb.toString();
    }

    public static Double round(Double val, Integer places) {
        if (val == null || places == null) return null;
        double scale = Math.pow(10, places);
        return Math.round(val * scale) / scale;
    }

    public static Double avg(String prefix, Map<String, String> map) {
        List<Double> vals = getValues(prefix, map);
        if (vals.isEmpty()) return 0.0;
        return vals.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }

    public static Double sum(String prefix, Map<String, String> map) {
        return getValues(prefix, map).stream().mapToDouble(Double::doubleValue).sum();
    }

    public static Double min(String prefix, Map<String, String> map) {
        return getValues(prefix, map).stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
    }

    public static Double max(String prefix, Map<String, String> map) {
        return getValues(prefix, map).stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
    }

    public static Integer count(String prefix, Map<String, String> map) {
        return getValues(prefix, map).size();
    }

    private static List<Double> getValues(String prefix, Map<String, String> map) {
        List<Double> list = new ArrayList<>();
        int i = 0;
        while (true) {
            String key = prefix + "." + i;
            if (!map.containsKey(key)) break;
            try {
                list.add(Double.parseDouble(map.get(key)));
            } catch (NumberFormatException e) {
                // Ignore non-numeric
            }
            i++;
        }
        return list;
    }
}
