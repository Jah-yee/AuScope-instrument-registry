this.ckan.module('gcmd-fields-handler-module', function ($, _) {
    return {
        initialize: function () {
            var labelFieldName = this.el.data('label-field');

            // Determine scheme based on is_platform flag present in the form
            var isPlatform = $('#field-is_platform').val() === 'true';
            this.scheme = isPlatform
                ? (this.el.data('scheme-platform') || this.el.data('scheme') || 'science')
                : (this.el.data('scheme') || 'science');
            this.includeScience = this._includesScience(this.scheme);

            // Update label to match instrument vs platform context
            var labelKey = isPlatform ? 'label-platform' : 'label-instrument';
            var labelText = this.el.data(labelKey);
            if (labelText) {
                this.el.find('.gcmd-label-text').text(labelText);
            }

            this.textInputElement = $('#field-' + labelFieldName);
            this.inputElement = this.el.find('input.gcmd-keywords');

            this.initializeSelect2();
            this.prepopulateSelect2();

        },

        initializeSelect2: function () {

            var self = this;
            var nextPage = 0;
            var lastSearchTerm = null;

            this.inputElement.select2({
                placeholder: "Select Keywords",
                delay: 250,
                minimumInputLength: 3,
                tags: [],
                tokenSeparators: [",", " "],
                multiple: true,
                cache: true,
                query: function (query) {
                    if (lastSearchTerm !== query.term) {
                        nextPage = 0; 
                        lastSearchTerm = query.term; 
                    }

                    var apiUrl = '/api/proxy/fetch_gcmd';
                    var data = {
                        page: nextPage, 
                        keywords: query.term,
                        scheme: self.scheme
                    };
                    if (self.includeScience) {
                        data.include_science = 'true';
                    }

                    $.ajax({
                        type: 'GET',
                        url: apiUrl,
                        data: data, 
                        dataType: 'json',
                        success: function (response) {
                            var result = response.result || {};
                            var items = (result.items || []).map(function (item) {
                                return { id: item._about, text: item.prefLabel._value };
                            });
                            nextPage = (result.page || 0) + 1;
                            query.callback({ results: items, more: !!result.next });
                        }
                    });
                }
            }).on("change", function (e) {
                self.updateDependentFields();
            });
        },
        updateDependentFields: function () {
            var self = this;
            var selectedData = self.inputElement.select2('data');
            var texts = selectedData.map(function (item) { return item.text; });
            self.textInputElement.val(JSON.stringify(texts));
        },

        prepopulateSelect2: function () {
            var self = this;
            var existingIdsString = this.inputElement.val();
            var existingIds = existingIdsString ? existingIdsString.split(',') : [];

            var existingTextsString = this.textInputElement.val();
            var existingTexts = existingTextsString ? JSON.parse(existingTextsString) : [];
            if (existingIds.length > 0 && existingIds[0] !== "") {
                var dataForSelect2 = existingIds.map(function (id, index) {
                    return { id: id, text: existingTexts[index] };
                });
                self.inputElement.select2('data', dataForSelect2, true);
            }
        },
        _includesScience: function (scheme) {
            return ['instruments', 'platforms', 'measured_variables'].indexOf(scheme) !== -1;
        }
    };
});
