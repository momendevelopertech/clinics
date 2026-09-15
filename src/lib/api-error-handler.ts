/**
 * Centralized API Error Handling Layer
 * Parses HTTP responses or thrown errors and maps them to localized, user-friendly
 * error messages with actionable resolution suggestions.
 */

export interface FormattedApiError {
  message: string;
  suggestion?: string;
  statusCode?: number;
}

export function formatApiError(
  error: unknown,
  translateFn?: (key: string) => string,
): FormattedApiError {
  const t = translateFn ?? ((k: string) => k);

  if (error instanceof Response) {
    switch (error.status) {
      case 400:
        return {
          message: t("err_bad_request"),
          suggestion: t("err_bad_request_hint"),
          statusCode: 400,
        };
      case 401:
        return {
          message: t("err_unauthorized"),
          suggestion: t("err_unauthorized_hint"),
          statusCode: 401,
        };
      case 403:
        return {
          message: t("err_forbidden"),
          suggestion: t("err_forbidden_hint"),
          statusCode: 403,
        };
      case 404:
        return {
          message: t("err_not_found"),
          suggestion: t("err_not_found_hint"),
          statusCode: 404,
        };
      case 409:
        return {
          message: t("err_conflict"),
          suggestion: t("err_conflict_hint"),
          statusCode: 409,
        };
      case 500:
      default:
        return {
          message: t("err_server_error"),
          suggestion: t("err_server_error_hint"),
          statusCode: error.status || 500,
        };
    }
  }

  if (error instanceof Error) {
    const rawMsg = error.message;

    if (rawMsg.includes("403") || rawMsg.toLowerCase().includes("forbidden")) {
      return {
        message: t("err_forbidden"),
        suggestion: t("err_forbidden_hint"),
        statusCode: 403,
      };
    }

    if (rawMsg.includes("404") || rawMsg.toLowerCase().includes("not found")) {
      return {
        message: t("err_not_found"),
        suggestion: t("err_not_found_hint"),
        statusCode: 404,
      };
    }

    if (rawMsg.includes("Failed to fetch") || rawMsg.includes("NetworkError")) {
      return {
        message: t("err_network"),
        suggestion: t("err_network_hint"),
      };
    }

    return {
      message: rawMsg || t("common_error"),
      suggestion: t("err_generic_hint"),
    };
  }

  return {
    message: t("common_error"),
    suggestion: t("err_generic_hint"),
  };
}

export function handleApiError(
  error: unknown,
  translateFn?: (key: string) => string,
): string {
  const formatted = formatApiError(error, translateFn);
  if (formatted.suggestion) {
    return `${formatted.message} — ${formatted.suggestion}`;
  }
  return formatted.message;
}
